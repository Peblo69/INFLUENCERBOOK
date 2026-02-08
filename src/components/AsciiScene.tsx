import { useRef, useEffect, useState, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer } from "@react-three/postprocessing"
import { Vector2, Vector3, CurvePath, CubicBezierCurve3, Mesh } from "three"
import { AsciiEffect } from "./AsciiEffect"

// Build the infinity curve from the exact Lottie bezier data (infinity-loop.json)
function createInfinityCurve(scale = 0.15): CurvePath<Vector3> {
  // Vertices
  const v = [
    [-3.423, 2.91], [3.423, -2.91], [9.932, -0.552],
    [9.964, 0], [9.932, 0.552], [3.423, 2.91],
    [-3.423, -2.91], [-9.931, -0.552], [-9.964, 0], [-9.931, 0.552]
  ]
  // Out-tangents (relative to vertex)
  const o = [
    [1.944, -1.652], [2.351, -1.998], [0.021, 0.181],
    [0, 0.186], [-0.368, 3.062], [-1.943, -1.652],
    [-2.351, -1.998], [-0.022, 0.181], [0, 0.186], [0.368, 3.062]
  ]
  // In-tangents (relative to vertex)
  const i = [
    [-2.351, 1.998], [-1.943, 1.652], [-0.368, -3.063],
    [0, -0.187], [0.021, -0.182], [2.351, 1.998],
    [1.944, 1.652], [0.368, -3.063], [0, -0.187], [-0.022, -0.182]
  ]

  const curvePath = new CurvePath<Vector3>()

  for (let idx = 0; idx < v.length; idx++) {
    const next = (idx + 1) % v.length
    const p0 = new Vector3(v[idx][0] * scale, -v[idx][1] * scale, 0)
    const cp1 = new Vector3(
      (v[idx][0] + o[idx][0]) * scale,
      -(v[idx][1] + o[idx][1]) * scale,
      0
    )
    const cp2 = new Vector3(
      (v[next][0] + i[next][0]) * scale,
      -(v[next][1] + i[next][1]) * scale,
      0
    )
    const p1 = new Vector3(v[next][0] * scale, -v[next][1] * scale, 0)

    curvePath.add(new CubicBezierCurve3(p0, cp1, cp2, p1))
  }

  return curvePath
}

function InfinityShape() {
  const meshRef = useRef<Mesh>(null)
  const curve = useMemo(() => createInfinityCurve(0.15), [])
  const tubeArgs = useMemo(
    () => [curve, 200, 0.12, 12, false] as const,
    [curve]
  )

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef}>
      <tubeGeometry args={tubeArgs} />
      <meshStandardMaterial color="#917aff" roughness={0.3} metalness={0.1} />
    </mesh>
  )
}

export function AsciiScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [resolution, setResolution] = useState(new Vector2(256, 256))
  const [webglUnavailable, setWebglUnavailable] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      setResolution(new Vector2(rect.width, rect.height))

      const handleResize = () => {
        const rect = container.getBoundingClientRect()
        setResolution(new Vector2(rect.width, rect.height))
      }
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }
  }, [])

  if (webglUnavailable) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center text-white/60 text-4xl"
      >
        ∞
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "low-power" }}
        style={{ background: "#5c5c5c" }}
        onCreated={({ gl }) => {
          const handleContextLost = (event: Event) => {
            event.preventDefault()
            setWebglUnavailable(true)
          }
          gl.domElement.addEventListener("webglcontextlost", handleContextLost, false)
        }}
      >
        <color attach="background" args={["#5c5c5c"]} />

        <hemisphereLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <directionalLight position={[-5, 3, -5]} intensity={1.2} />

        <InfinityShape />

        <EffectComposer>
          <AsciiEffect
            style="standard"
            cellSize={9}
            invert={false}
            color={true}
            resolution={resolution}
            mousePos={new Vector2(0, 0)}
            postfx={{
              scanlineIntensity: 0,
              scanlineCount: 200,
              targetFPS: 0,
              jitterIntensity: 0,
              jitterSpeed: 1,
              mouseGlowEnabled: false,
              mouseGlowRadius: 200,
              mouseGlowIntensity: 1.5,
              vignetteIntensity: 0,
              vignetteRadius: 0.8,
              colorPalette: 0,
              curvature: 0,
              aberrationStrength: 0,
              noiseIntensity: 0,
              noiseScale: 1,
              noiseSpeed: 1,
              waveAmplitude: 0,
              waveFrequency: 10,
              waveSpeed: 1,
              glitchIntensity: 0,
              glitchFrequency: 0,
              brightnessAdjust: 0,
              contrastAdjust: 1,
            }}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
