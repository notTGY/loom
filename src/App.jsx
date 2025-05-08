"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Camera, CameraOff, Download, RefreshCw } from "lucide-react"

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isAiReady, setIsAiReady] = useState(false)
  const [isRunningAi, setIsRunningAi] = useState(false)
  const [mediaStream, setMediaStream] = useState(null)
  const animationRef = useRef(null)


  useEffect(() => {
    async function getMediaStream() {
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ video: true })
        setMediaStream(ms)
        /*

        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        setDevices(videoDevices)
        if (videoDevices.length > 0) {
          setSelectedDevice(videoDevices[0].deviceId)
        }
        */
      } catch (err) {
        console.error("Error accessing media devices:", err)
      }
    }

    getMediaStream()
  }, [])

  const startStream = async () => {
    if (!mediaStream) return

    try {
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
        renderCanvas()
        setIsStreaming(true)
      }
    } catch (err) {
      console.error("Error accessing the camera:", err)
    }
  }

  const stopStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsStreaming(false)

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  const toggleStream = () => {
    if (isStreaming) {
      stopStream()
    } else {
      startStream()
    }
  }

  const renderCanvas = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    const ctx = canvas.getContext("2d")

    const updateCanvas = () => {
      if (!video.paused && !video.ended) {
        const {videoHeight: vh, videoWidth: vw} = video
        const w = vw
        canvas.width = w
        canvas.height = w*vh/vw

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        animationRef.current = requestAnimationFrame(updateCanvas)
      }
    }

    updateCanvas()
  }

  const [box, setBox] = useState({xmin: 0, ymin: 0, xmax: 640, ymax: 480})


  const worker = useRef(null)
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      })
    }
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'complete':
          const output = e.data.output
          const person = output.find(i => i.label == 'person')
          requestAnimationFrame(runAi)
          if (!person) {
            break
          }
          setBox(person.box)
          break
        case 'ready':
          setIsAiReady(true)
          //runAi()
          //setBox({xmin: 0, ymin: 0, xmax: 640, ymax: 480})
      }
    }
    worker.current.addEventListener('message', onMessageReceived)
    return () => worker.current.removeEventListener('message', onMessageReceived)
  }, [])

  const runAi = async () => {
    const c = document.querySelector('canvas')
    const img = c.toDataURL()
    worker.current.postMessage({
      img,
    })
  }

  let transform = ''
  let transformScale = ''
  let boxStyle = {display:'none'}
  if (Object.keys(box).length > 0) {
    const x = box.xmin
    const y = box.ymin
    const w = box.xmax-box.xmin
    const h = box.ymax-box.ymin
    const centerX = (box.xmin + box.xmax) / 2
    const centerY = (box.ymin + box.ymax) / 2

    boxStyle.display = 'block'
    boxStyle.width = w
    boxStyle.height = h
    boxStyle.top = `${y}px`
    boxStyle.left = `${x}px`

    if (videoRef.current) {
      const vh = videoRef.current.videoHeight
      const vw = videoRef.current.videoWidth
      const squaredw = (vw-vh)/2
      const scale = Math.min(vw/w, vh/h)

      const dh = (scale-1.01)*vh
      const dw = (scale-1.01)*vw

      const dx = vw/2 - centerX + dw/2 - squaredw
      const dy = vh/2 - centerY + dh/2

      let tx = dx
      if (dx > 0) {
        tx = Math.min(dx, dw)
      } else {
        tx = Math.max(dx, -dw)
      }
      let ty = dy
      if (dy > 0) {
        ty = Math.min(dy, dh)
      } else {
        ty = Math.max(dy, -dh)
      }


      transform = `translate(${tx}px, ${ty}px)`
      transformScale = `translate(${tx}px, ${ty}px) scale(${scale}, ${scale})`
    }
  }

  const aiControls = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-end space-x-2 h-full">

        <Button size="sm" onClick={() => {
          runAi()
          setIsRunningAi(true)
        }} disabled={!isAiReady}>
          Run AI
        </Button>
      </div>
    </div>
  )

  const controls = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-end space-x-2 h-full">
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            navigator.mediaDevices.enumerateDevices().then((devices) => {
              const videoDevices = devices.filter((device) => device.kind === "videoinput")
              //setDevices(videoDevices)
            })
          }}
          disabled={isStreaming}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button variant={isStreaming ? "destructive" : "default"} size="sm" onClick={toggleStream}>
          {isStreaming ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
          {isStreaming ? "Stop Camera" : "Start Camera"}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col">
      <video
        ref={videoRef}
        muted
        className="hidden max-w-full max-h-full"
        playsInline
      />

      <div className="relative overflow-hidden aspect-square w-96 flex justify-center">
        <canvas style={{transform: transformScale}} ref={canvasRef} className=" transition-all duration-2000 ease-[cubic-bezier(0.060,0.975,0.195,0.985)] h-full bg-green-300" />
        {/*
        <div style={{transform}} className="absolute top-0 left-0">
          <div className="absolute">
            <div style={boxStyle} className=" border border-red-300 absolute"/>
          </div>
        </div>
        */}
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p>Camera is not active</p>
          </div>
        )}
      </div>

      {isStreaming
        ? isRunningAi
        ? null
        : aiControls
        : controls}



    </div>
  )
}
