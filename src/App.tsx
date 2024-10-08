// src/App.tsx

import { useState, useEffect, useReducer } from 'react'
import { DirectoryPicker } from './components/DirectoryPicker'
import DirectoryView from './components/DirectoryView'
import SearchBar from './components/SearchBar'
import FileGrid from './components/FileGrid'
import AudioPlayer from './components/AudioPlayer'
import { FileInfo } from './@types/FileInfo'
import { useAudio } from './hooks/AudioContextProvider'
import MetadataDisplay from './components/MetadataDisplay'

export function App() {
  const [directoryPath, setDirectoryPath] = useState<string[]>([])
  const [currentAudio, setCurrentAudio] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.8)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<FileInfo[]>([])
  const [files, setFiles] = useState<FileInfo[]>([])
  const [audioMetadata, setAudioMetadata] = useState<any>(null)
  const FILE_EXTENSIONS = {
    images: ['jpg', 'png'],
    text: ['txt', 'md'],
    audio: [
      'mp3',
      'mp2',
      'mp1',
      'aif',
      'aiff',
      'aifc',
      'wav',
      'wave',
      'bwf',
      'flac',
      'flc',
      'ogg',
    ],
    video: ['mp4', 'mov', 'avi'],
  }

  const { playAudio } = useAudio()

  /** Fetches files from the current directory and sets the sorted result */
  const fetchFiles = () => {
    window.Main.readdir(directoryPath)
      .then(result => {
        const sortedFiles = sortFiles(result)
        setFiles(sortedFiles)
      })
      .catch(err => window.Main.sendMessage('App.tsx: ' + err))
  }

  /** Sorts files by directories first, then by name */
  const sortFiles = (files: FileInfo[]): FileInfo[] => {
    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  }

  /** Initiates a search for files and directories matching the query */
  const searchFiles = () => {
    if (searchQuery.length > 0) {
      window.Main.search(directoryPath, searchQuery)
        .then((result: any) => setSearchResults(result))
        .catch((err: any) => window.Main.sendMessage('App.tsx: ' + err))
        .finally(() => {})
    } else {
      setSearchResults([])
    }
  }

  const handleDirectoryClick = (directory: string[]) => {
    if (searchQuery.length > 0) {
      setSearchQuery('')
      let newDirectory = directory
      window.Main.sendMessage('App.tsx: newDirectory: ' + newDirectory)
      setDirectoryPath(newDirectory)
      setSearchResults([])
    } else {
      setDirectoryPath(directory)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [directoryPath])

  useEffect(() => {
    const initializeApp = async () => {
      const lastSelectedDirectory = await window.Main.getLastSelectedDirectory()
      if (lastSelectedDirectory) {
        setDirectoryPath([lastSelectedDirectory])
      }
    }

    initializeApp()

    const keyDownHandler = (event: any) => {
      console.log('User pressed: ', event.key)

      if (event.key === 'Enter') {
        event.preventDefault()

        if (currentAudio) {
          playAudio(currentAudio)
        }
      }
    }

    document.addEventListener('keydown', keyDownHandler)

    return () => {
      document.removeEventListener('keydown', keyDownHandler)
    }
  }, [])

  const handleFileClick = async (file: FileInfo) => {
    setCurrentAudio('')
    const extension = file.name.split('.').pop()

    try {
      if (extension && FILE_EXTENSIONS.audio.includes(extension)) {
        let audioPath = ''
        if (searchQuery.length > 0) {
          console.log(file.location)
          audioPath = window.Main.renderPath([file.location])
          window.Main.sendMessage('' + audioPath)
        } else {
          audioPath = window.Main.renderPath([...directoryPath, file.name])
          window.Main.sendMessage('' + audioPath)
        }
        if (window.Main.doesFileExist(audioPath)) {
          const metadata = await window.Main.getAudioMetadata(audioPath)
          setAudioMetadata(metadata)
          playAudio(`sample:///${audioPath}`)
        } else {
          throw new Error('File does not exist: ' + audioPath)
        }
      }
    } catch (err) {
      window.Main.sendMessage('App.tsx: ' + err)
    }
  }

  return (
    <div style={{ height: '80vh' }}>
      <DirectoryPicker onDirectorySelected={setDirectoryPath} />
      <DirectoryView
        directoryPath={directoryPath}
        onDirectoryClick={setDirectoryPath}
      />
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={searchFiles}
        setSearchResults={setSearchResults}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '10px',
          maxWidth: '1200px',
          margin: '0 auto',
          height: '100%',
        }}
      >
        <FileGrid
          files={searchResults.length > 0 ? searchResults : files}
          directoryPath={directoryPath}
          onDirectoryClick={handleDirectoryClick}
          onFileClick={handleFileClick}
        />
        <div>
          <MetadataDisplay metadata={audioMetadata || null} />
        </div>
      </div>

      <AudioPlayer
        currentAudio={currentAudio}
        volume={volume}
        setVolume={setVolume}
        shouldReplay
      />
    </div>
  )
}
