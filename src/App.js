import MicRecorder from 'mic-recorder-to-mp3'
import { useEffect, useState, useRef } from 'react'
import { Oval } from 'react-loader-spinner'
import axios from 'axios'

const APIKey = 'f7414a29faab4049a0cb6c3cd01c1bba'

// Set AssemblyAI Axios Header
const assemblyAI = axios.create({
  baseURL: 'https://api.assemblyai.com/v2',
  headers: {
    authorization: APIKey,
    'content-type': 'application/json',
    'transfer-encoding': 'chunked',
  },
})

const App = () => {
  // Mic-Recorder-To-MP3
  const recorder = useRef(null) // Recorder
  const audioPlayer = useRef(null) // Ref for the HTML Audio Tag
  const [blobURL, setBlobUrl] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [isRecording, setIsRecording] = useState(null)

  // States for file upload
  const [selectedFile, setSelectedFile] = useState(null)

  // AssemblyAI states
  const [uploadURL, setUploadURL] = useState('')
  const [transcriptID, setTranscriptID] = useState('')
  const [transcriptData, setTranscriptData] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // State for upload progress
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    // Declares the recorder object and stores it inside of ref
    recorder.current = new MicRecorder({ bitRate: 128 })
  }, [])

  const startRecording = () => {
    // Check if recording isn't blocked by the browser
    recorder.current.start().then(() => {
      setIsRecording(true)
    })
  }

  const stopRecording = () => {
    recorder.current
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const file = new File(buffer, 'audio.mp3', {
          type: blob.type,
          lastModified: Date.now(),
        })
        const newBlobUrl = URL.createObjectURL(blob)
        setBlobUrl(newBlobUrl)
        setIsRecording(false)
        setAudioFile(file)
      })
      .catch((e) => console.log(e))
  }

  const handleFileChange = (event) => {
    const file = event.target.files[0]
    setSelectedFile(file)
  }

  const submitTranscriptionHandler = () => {
    if (selectedFile || audioFile) {
      // Upload the selected file or the recorded audio file
      const fileToUpload = selectedFile || audioFile

      const formData = new FormData()
      formData.append('file', fileToUpload)

      assemblyAI
        .post('/upload', formData, {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            )
            setUploadProgress(progress)
          },
        })
        .then((res) => setUploadURL(res.data.upload_url))
        .then(() => {
          // Submit the Upload URL to AssemblyAI and retrieve the Transcript ID

          assemblyAI
            .post('/transcript', {
              audio_url: uploadURL,
            })
            .then((res) => {
              setTranscriptID(res.data.id)
              checkStatusHandler()
            })
            .catch((err) => console.error(err))
        })
        .catch((err) => console.error(err))
    }
  }

  const checkStatusHandler = async () => {
    setIsLoading(true)
    try {
      await assemblyAI.get(`/transcript/${transcriptID}`).then((res) => {
        setSelectedFile(null)
        setTranscriptData(res.data)
      })
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (transcriptData.status !== 'completed' && isLoading) {
        checkStatusHandler()
      } else {
        setIsLoading(false)
        setTranscript(transcriptData.text)

        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  })

  console.log(selectedFile)

  return (
    <div className='flex flex-col items-center justify-center mt-10 mb-20 space-y-4'>
      <h1 className='text-4xl'>React Speech Recognition App 🎧</h1>
      <div className='flex-btns'>
        <audio ref={audioPlayer} src={blobURL} controls='controls' />
        <div>
          <button
            className='btn btn-primary'
            onClick={startRecording}
            disabled={isRecording}
          >
            Record
          </button>
          <button
            className='btn btn-warning'
            onClick={stopRecording}
            disabled={!isRecording}
          >
            Stop
          </button>
        </div>
      </div>

      <div className='upload-btn-container'>
        <button className='upload-button'>Upload a file</button>
        <input type='file' accept='audio/*' onChange={handleFileChange} />
      </div>
      {selectedFile &&
        'File ready for transcription, click on submit to transcribe.'}

      <div className='mt-4 w-full'>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className='relative pt-1'>
            <div className='flex mb-2 items-center justify-between'>
              <div className='text-right'>
                <span className='text-xs font-semibold inline-block text-teal-600'>
                  {uploadProgress}%
                </span>
              </div>
            </div>
            <div className='flex flex-col'>
              <div className='progress-wrapper'>
                <div
                  className='progress-bar'
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <button
        className='btn btn-secondary'
        onClick={submitTranscriptionHandler}
      >
        Submit for Transcription
      </button>

      {isLoading ? (
        <div>
          <Oval
            ariaLabel='loading-indicator'
            height={100}
            width={100}
            strokeWidth={5}
            color='red'
            secondaryColor='yellow'
          />
          <p className='text-center'>Is loading....</p>
        </div>
      ) : (
        <div></div>
      )}
      {!isLoading && transcript && (
        <div className='mockup-code'>
          <p className='p-6'>{transcript}</p>
          <div className='flex justify-end'>
            <button
              className='btn btn-secondary'
              onClick={() => navigator.clipboard.writeText(transcript)}
            >
              Copy text
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
