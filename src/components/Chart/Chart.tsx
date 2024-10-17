import * as Plot from '@observablehq/plot'
import * as d3 from 'd3'
import { useEffect, useRef, useState } from 'react'
import './Chart.css'

enum Scope {
  LOCAL = 'local',
  GLOBAL = 'global',
}

type SessionData = {
  x: number;
  y: number;
  scope: Scope;
}

type Emotion = {
  name: string;
  color?: [number, number, number,];
  hsl?: [number, number, number,];
  position: [number, number]
}

const emotions: Emotion[] = [
  {
    name: 'joy',
    color: [255, 248, 77],
    position: [0.97, 0.56],
  },
  {
    name: 'excited',
    color: [242, 136, 38],
    position: [0.845, 0.86],
  },
  {
    name: 'alarmed',
    color: [210, 37, 25],
    hsl: [4, 0.79, 0.46],
    position: [0.46, 0.945],
  },
  {
    name: 'annoyed',
    color: [182, 18, 67],
    hsl: [342, 0.82, 0.39],
    position: [0.28, 0.83],
  },
  {
    name: 'anxious',
    color: [239, 92, 180],
    position: [0.14, 0.105],
  },
  {
    name: 'bored',
    color: [99, 26, 192],
    position: [0.33, 0.105],
  },
  {
    name: 'serious',
    color: [43, 48, 170],
    position: [0.61, 0.17],
  },
  {
    name: 'relaxed',
    color: [26, 179, 192],
    position: [0.855, 0.17],
  },
  {
    name: 'neutral',
    color: [128, 128, 128],
    position: [0.5, 0.5],
  },
]

/**
 * Converts an array of three numbers to an RGB string.
 *
 * @param color - An array of three numbers representing RGB values.
 * @returns A string in the format "rgb(r, g, b)".
 */
function toRgb (color: [number, number, number]): string {
  const [r, g, b] = color
  return `rgb(${ r }, ${ g }, ${ b })`
}

/**
 * A React component that renders a heatmap chart using D3 and Observable Plot.
 * The chart displays local and global session data on a 100x100 grid.
 * Includes an option to compare data points interactively using a checkbox.
 *
 * @return {JSX.Element} The chart component with the ability to compare data points using a checkbox.
 */
export default function Chart () {
  const containerRef = useRef<HTMLDivElement>(null)
  const [localData, setLocalData] = useState<SessionData[] | undefined>([])
  const [globalData, setGlobalData] = useState<SessionData[] | undefined>([])

  const [displayPoints, setDisplayPoints] = useState<boolean>(false)
  const [opacity, setOpacity] = useState<number>(5)
  const [bandwidth, setBandwidth] = useState<number>(20)
  const [skew, setSkew] = useState<number>(0)

  // Load the data either from a state or from the API using fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        let l: SessionData[] | undefined = await d3.json(
          '/datasets/local-heatmap.json')
        let g: SessionData[] | undefined = await d3.json(
          '/datasets/global-heatmap.json')

        if (l === undefined || g === undefined) return

        setLocalData(l)
        setGlobalData(g)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData().then() // not sure why `then()` is called here
  }, [])

  /**
   * Generates a 100x100 grid from a set of data points, where each point increments the count of
   * its corresponding grid cell. Each data point is expected to have an x and y value normalized
   * between 0 and 1.
   *
   * @param data - An array of data points, where each data point is expected to have x and y properties.
   * @returns A 100x100 grid with counts of data points falling into each cell.
   */
  function getGrid (data: SessionData[]): number[][] {
    const grid: number[][] = Array.from({ length: 100 },
      () => Array.from({ length: 100 }, () => 0))

    data.forEach((d) => {
      const xIndex = Math.floor(d.x * 100)
      const yIndex = Math.floor(d.y * 100)
      grid[yIndex][xIndex] += 1
    })

    return grid
  }

  /**
   * Flattens a 2D grid into a 1D array.
   *
   * @param grid - A 2-dimensional array of numbers representing the grid.
   * @returns A 1-dimensional array with all the numbers from the grid.
   */
  function flattenGrid (grid: number[][]): number[] {
    const flatGrid: number[] = []
    grid.map((row) => flatGrid.push(...row))
    return flatGrid
  }

  // Build the Observable Plot Charts
  useEffect(() => {
    if (localData === undefined || globalData === undefined) return

    const plot = Plot.plot({
      color: {
        legend: true,
        label: 'Intensity',
        scheme: 'turbo',
        domain: [0, 1],
      },
      clamp: true,
      x: {
        type: 'linear',
        grid: true,
        domain: [0, 1],
        ticks: 20,
        clamp: true,
      },
      y: {
        type: 'linear',
        grid: true,
        domain: [0, 1],
        ticks: 20,
        clamp: true,
      },
      width: 1024,
      height: 1024,
      grid: true,
      caption: 'Figure 1. An example of two superimposed density maps.',
      // Each "mark" is a layer
      marks: [
        Plot.frame(),
        // Heatmaps
        Plot.density(globalData, {
          weight: 0.2,
          x: 'x',
          y: 'y',
          bandwidth,
          stroke: 'density',
          strokeOpacity: opacity - skew,
          thresholds: 100,
        }),
        Plot.density(localData, {
          x: 'x',
          y: 'y',
          opacity: 1,
          bandwidth,
          fill: 'density',
          fillOpacity: opacity + skew,
          stroke: 'density',
          strokeOpacity: opacity + skew,
          thresholds: 100,
        }),
        // Here we switch the dots on and off but we can use a slider and use the "opacity" instead
        displayPoints ? Plot.dot(localData, {
          x: 'x',
          y: 'y',
          fill: 'white',
          stroke: 'white',
          strokeOpacity: 0.5,
          fillOpacity: 0.2,
          r: 1.5,
        }) : null,
        Plot.text(emotions, {
          x: (d: Emotion) => d.position[0],
          y: (d: Emotion) => d.position[1],
          text: (d: Emotion) => d.name,
          lineAnchor: 'bottom',
          dy: -8,
        }),
        Plot.dot(emotions, {
          x: (d: Emotion) => d.position[0],
          y: (d: Emotion) => d.position[1],
          fill: (d: Emotion) => toRgb(d.color!),
        }),
      ],
    })

    // Attach the plot to the DOM
    containerRef.current!.append(plot)

    return () => plot.remove()
  }, [localData, globalData, opacity, bandwidth, skew, displayPoints])

  const togglePoints = () => {
    setDisplayPoints(!displayPoints)
  }

  /**
   * Handles the change in opacity value from the range input slider.
   *
   * @param event - The event triggered by the input change.
   */
  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(event.target.value)
    setOpacity(newOpacity) // Assuming you have a state variable `opacity` to manage this
  }

  /**
   * Handles the change in bandwidth.
   *
   * @param event - The event triggered by the input change.
   */
  const handleBandwidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newBandwidth = parseFloat(event.target.value)
    setBandwidth(newBandwidth) // Assuming you have a state variable `opacity` to manage this
  }

  /**
   * Event handler for updating the skew value from a user input.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - The event object triggered by the input change.
   */
  const handleSkewChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSkew = parseFloat(event.target.value)
    setSkew(newSkew)
  }

  return (
    <>
      <div className={ 'gui' }>
        <div>
          <label>Points: <input type={ 'checkbox' } onChange={ togglePoints }/></label>
        </div>
        <div>
          <label>
            Opacity: <input type="range" min="0" max="1" step="0.1"
                            value={ opacity } onChange={ handleOpacityChange }/>
          </label>
        </div>
        <div>
          <label>
            Bandwidth: <input type="range" min="10" max="80" step="2"
                              value={ bandwidth }
                              onChange={ handleBandwidthChange }/>
          </label>
        </div>
        <div>
          <label>
            Skew: <input type="range" min="-1" max="1" step=".01" value={ skew }
                         onChange={ handleSkewChange }/>
          </label>
        </div>
      </div>
      <div ref={ containerRef }></div>
    </>
  )
}
