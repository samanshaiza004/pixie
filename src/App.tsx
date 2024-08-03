// src/App.tsx
import { GlobalStyle } from './styles/GlobalStyle'
import { Dirent } from 'original-fs'
import React, { useState, useEffect, useRef } from 'react'
import { FileItem } from './components/FileItem'
import { FileAddressItem } from './components/FileAddressItem/FileAddressItem'
import { DirectoryPicker } from './components/DirectoryPicker/DirectoryPicker'
import WaveSurfer from 'wavesurfer.js'

interface FileInfo {
  name: string
  isDirectory: boolean
}

const FILE_EXTENSIONS = {
  images: ['jpg', 'png'],
  text: ['txt', 'md'],
  audio: ['mp3', 'wav', 'flac', 'ogg'],
  video: ['mp4', 'mov', 'avi'],
}

declare global {
  interface Window {
    Main: {
      sendMessage: (message: string) => void
      readdir: (
        path: string[]
      ) => Promise<{ name: string; isDirectory: boolean }[]>
      renderPath: (pathParts: string[]) => string
      moveDir: (currentPath: string[], newDir: string) => Promise<string[]>
      isDirectory: (path: string) => boolean
      openDirectoryPicker: () => Promise<string | null>
    }
  }
}

export function App() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [path, setPath] = useState<string[]>([
    '/',
    'home',
    'saman',
    'dev',
    'july2024',
  ])
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const getFiles = () => {
    window.Main.readdir(path)
      .then((result: any) => {
        const sortedFiles = sortFiles(result)
        setFiles(sortedFiles)
      })
      .catch((err: string) => window.Main.sendMessage('App.tsx: ' + err))
  }

  const waveformRef = useRef<HTMLDivElement>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)

  const playAudio = (path: string) => {
    if (waveSurferRef.current) {
      waveSurferRef.current.stop()
      // waveSurferRef.current.empty()
      waveSurferRef.current?.load(path)
      // waveSurferRef.current?.play()
    }
  }

  // sort files: directories first, then files, then alphabetically
  const sortFiles = (files: FileInfo[]): FileInfo[] => {
    return files.sort((a: FileInfo, b: FileInfo) => {
      if (a.isDirectory && !b.isDirectory) {
        return -1
      }
      if (!a.isDirectory && b.isDirectory) {
        return 1
      }
      return a.name.localeCompare(b.name)
    })
  }
  useEffect(() => {
    getFiles()
  }, [path])

  useEffect(() => {
    if (waveformRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'white',
        progressColor: 'purple',
        barWidth: 4,
        barRadius: 30,
        barHeight: 4,
        height: 64,
      })

      waveSurferRef.current.on('ready', () => {
        waveSurferRef.current?.play()
      })

      waveSurferRef.current.on('click', () => {
        waveSurferRef.current?.play()
      })
    }
  }, [])

  const handleDirectoryClick = async (dir: string) => {
    scrollToTop()
    window.Main.sendMessage('directory clicked: ' + dir)
    const newPath = await window.Main.moveDir(path, dir)
    window.Main.sendMessage('new path: ' + JSON.stringify(newPath))
    setPath(newPath.slice(0, newPath.length))
  }
  const handleFileClick = (item: FileInfo) => {
    const extension = item.name.split('.').pop()
    if (extension && FILE_EXTENSIONS.audio.includes(extension)) {
      const audioPath = window.Main.renderPath([...path, item.name])
      setCurrentAudio(audioPath)
      playAudio(`sample:///${audioPath}`)
    }
  }

  const handleDirectorySelected = async (dir: string) => {
    setPath([dir])
  }
  return (
    <div style={{ height: '100vh' }}>
      <DirectoryPicker onDirectorySelected={handleDirectorySelected} />
      <div
        style={{
          flexDirection: 'row',
          display: 'flex',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
        }}
      >
        {path.map((dir, index) => (
          <FileAddressItem
            key={index}
            onClick={() => handleDirectoryClick(dir)}
            fileName={dir}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        {files ? (
          files.map((file, index) => {
            const fullPath = window.Main.renderPath([...path, file.name])
            return (
              <FileItem
                key={index}
                style={{
                  color: window.Main.isDirectory(fullPath) ? 'red' : 'black',
                }}
                onClick={() => {
                  if (window.Main.isDirectory(fullPath)) {
                    handleDirectoryClick(file.name)
                  } else {
                    handleFileClick(file)
                  }
                }}
                fileName={file.name}
                isDirectory={file.isDirectory}
              >
                {file.name}{' '}
              </FileItem>
            )
          })
        ) : (
          <p>Loading...</p>
        )}
      </div>
      <div>
        currentAudio: {currentAudio}
        <div ref={waveformRef} />
      </div>
    </div>
  )
}
