"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ThumbsUp, ThumbsDown, Play } from "lucide-react"
import { YouTubeEmbed } from "./youtube-embed"
import axios from "axios"
import {getServerSession} from "next-auth"
import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "../lib/db"

// Type for a song in the queue
type Song = {
  streamId : string
  id: string
  url: string
  title: string
  thumbnail: string
  votes: number
  hasUpvoted : boolean
}

const REFRESH_INTERVAL_MS = 10000;

export default function Dashboard() {
  const [url, setUrl] = useState("")
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [queue, setQueue] = useState<Song[]>([])
  const [previewData, setPreviewData] = useState<{ title: string; thumbnail: string } | null>(null)
  const [isValidUrl, setIsValidUrl] = useState(false) 

  // Function to extract YouTube video ID from URL
  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const refreshStreams = async () => {
    try {
      const res = await fetch("/api/streams/my", {
        credentials: "include"
      });
      const data = await res.json();
      
      if (data.streams) {
        // Transform the streams data into our Song format
        const transformedStreams: Song[] = data.streams.map((stream: any) => ({
          streamId : stream.id,
          id: stream.extractedId,
          url: stream.url,
          title: stream.title,
          thumbnail: stream.smallImage,
          votes: stream.upvotesCount || 0,
          hasUpvoted: stream.hasUpvoted || false
        }));

        // Update the queue with the transformed streams
        setQueue(transformedStreams);
      }
    } catch (error) {
      console.error("Error fetching streams:", error);
    }
  };

  useEffect(() => {
    refreshStreams();
    const interval = setInterval(refreshStreams, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Validate URL and fetch preview data
  useEffect(() => {
    const videoId = extractVideoId(url)
    setIsValidUrl(!!videoId)

    if (videoId) {
      // In a real app, you would fetch this data from YouTube API
      // For demo purposes, we'll simulate it
      setPreviewData({
        title: `Video Title for ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      })
    } else {
      setPreviewData(null)
    }
  }, [url])

  // Add song to queue
  const addToQueue = async () => {
    try {
      if (!isValidUrl || !previewData) return

      const videoId = extractVideoId(url)
      if (!videoId) return

      // Create stream in database
      const response = await fetch("/api/streams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url
        }),
        credentials: "include" // This ensures cookies are sent with the request
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add stream to database");
      }

      const data = await response.json();
      
      // Create new song object with the database stream ID
      const newSong: Song = {
        streamId: data.id,
        id: videoId,
        url,
        title: previewData.title,
        thumbnail: previewData.thumbnail,
        votes: 0,
        hasUpvoted: false
      }

      // Update local state
      setQueue([...queue, newSong])
      setUrl("")
      setPreviewData(null)

      // If no song is currently playing, play this one
      if (!currentSong) {
        setCurrentSong(newSong)
        setQueue((prev) => prev.filter((song) => song.streamId !== newSong.streamId))
      }

      // Refresh streams to get the latest state
      await refreshStreams();
    } catch (error) {
      console.error("Error adding stream:", error);
      // You might want to show an error message to the user here
    }
  }

  // Vote for a song
  const vote = async (streamId: string, isUpvote: boolean) => {
    try {
      // Update local state first
      setQueue((prev) => {
        const updatedQueue = prev.map((song) => {
          if (song.streamId === streamId) {
            return {
              ...song,
              votes: song.votes + (isUpvote ? 1 : -1),
              hasUpvoted: isUpvote
            };
          }
          return song;
        });
        
        // Sort queue based on votes
        return updatedQueue.sort((a, b) => b.votes - a.votes);
      });

      // Call the appropriate endpoint based on vote type
      const endpoint = isUpvote ? "/api/streams/upvotes" : "/api/streams/downvotes";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamId: streamId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isUpvote ? 'upvote' : 'downvote'}`);
      }

      // Refresh the streams to get the latest state from the database
      await refreshStreams();
    } catch (error) {
      console.error("Error voting:", error);
      // Revert local state on error
      setQueue((prev) => {
        const updatedQueue = prev.map((song) => {
          if (song.streamId === streamId) {
            return {
              ...song,
              votes: song.votes + (isUpvote ? -1 : 1),
              hasUpvoted: !isUpvote
            };
          }
          return song;
        });
        return updatedQueue.sort((a, b) => b.votes - a.votes);
      });
    }
  };

  // Play next song
  const playNext = () => {
    if (queue.length === 0) {
      setCurrentSong(null)
      return
    }

    // Sort by votes and take the highest
    const sortedQueue = [...queue].sort((a, b) => b.votes - a.votes)
    setCurrentSong(sortedQueue[0])
    setQueue((prev) => prev.filter((song) => song.streamId !== sortedQueue[0].streamId))
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Muzi</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Playing Video */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Now Playing</h2>
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {currentSong ? (
              <YouTubeEmbed videoId={currentSong.id} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No song currently playing</p>
              </div>
            )}
          </div>

          {currentSong && (
            <div className="mt-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{currentSong.title}</h3>
              </div>
              <Button onClick={playNext} variant="secondary">
                Play Next Song
              </Button>
            </div>
          )}
        </div>

        {/* Submit and Queue */}
        <div className="space-y-8">
          {/* Submit Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Add a Song</h2>
            <div className="space-y-4">
              <Input
                placeholder="Paste YouTube URL here"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full"
              />

              {previewData && (
                <div className="flex gap-4 items-center p-3 border rounded-md">
                  <img
                    src={previewData.thumbnail || "/placeholder.svg"}
                    alt="Video thumbnail"
                    className="w-24 h-auto rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{previewData.title}</p>
                  </div>
                </div>
              )}

              <Button onClick={addToQueue} disabled={!isValidUrl} className="w-full">
                Add to Queue
              </Button>
            </div>
          </div>

          {/* Queue */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Coming Up Next</h2>
            {queue.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Queue is empty</p>
            ) : (
              <div className="space-y-3">
                {queue.map((song) => (
                  <Card key={song.streamId}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <img
                          src={song.thumbnail || "/placeholder.svg"}
                          alt={song.title}
                          className="w-20 h-auto rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{song.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {
                              song.hasUpvoted ? (
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => vote(song.streamId, false)}
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => vote(song.streamId, true)}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                              )
                            }
                            <span className="font-bold">{song.votes}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto"
                              onClick={() => {
                                setCurrentSong(song)
                                setQueue((prev) => prev.filter((s) => s.streamId !== song.streamId))
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" /> Play Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

