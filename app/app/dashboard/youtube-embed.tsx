"use client"

import { useEffect, useRef } from "react"

interface YouTubeEmbedProps {
  videoId: string
}

export function YouTubeEmbed({ videoId }: YouTubeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Create the iframe element
    const iframe = document.createElement("iframe")
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`
    iframe.title = "YouTube video player"
    iframe.frameBorder = "0"
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    iframe.allowFullscreen = true

    // Clear the container and append the iframe
    if (containerRef.current) {
      containerRef.current.innerHTML = ""
      containerRef.current.appendChild(iframe)
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [videoId])

  return <div ref={containerRef} className="w-full h-full" />
}

