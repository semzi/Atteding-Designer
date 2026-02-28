import { useState, useRef, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import './App.css'

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result as string)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        setPreviewUrl(null)
        setShowPreview(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const createCircularCrop = async (imageSrc: string, cropArea: CropArea): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        let imageUrl = imageSrc
        if (imageSrc.startsWith('blob:')) {
          imageUrl = imageSrc
        }
        
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const size = Math.min(cropArea.width, cropArea.height)
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          ctx.beginPath()
          ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI)
          ctx.closePath()
          ctx.clip()

          ctx.drawImage(
            img,
            cropArea.x,
            cropArea.y,
            cropArea.width,
            cropArea.height,
            0,
            0,
            size,
            size
          )

          resolve(canvas.toDataURL('image/png', 1.0))
        }
        img.onerror = reject
        img.src = imageUrl
      } catch (error) {
        reject(error)
      }
    })
  }

  const loadImageAsBlob = async (url: string): Promise<string> => {
    const response = await fetch(url)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  const mergeWithFlyer = async (circularImage: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        const flyerBlobUrl = await loadImageAsBlob('/flyer.jpg')
        
        const flyer = new Image()
        const profile = new Image()

        flyer.onload = () => {
          profile.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = flyer.naturalWidth
            canvas.height = flyer.naturalHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('Could not get canvas context'))
              return
            }

            ctx.drawImage(flyer, 0, 0)

            const circleSize = flyer.naturalWidth * 0.336
            const centerX = flyer.naturalWidth * 0.5051
            const centerY = flyer.naturalHeight * 0.6251

            ctx.save()
            ctx.beginPath()
            ctx.arc(centerX, centerY, circleSize / 2, 0, 2 * Math.PI)
            ctx.closePath()
            ctx.clip()

            ctx.drawImage(
              profile,
              centerX - circleSize / 2,
              centerY - circleSize / 2,
              circleSize,
              circleSize
            )
            ctx.restore()

            URL.revokeObjectURL(flyerBlobUrl)
            resolve(canvas.toDataURL('image/jpeg', 0.95))
          }
          profile.onerror = reject
          profile.src = circularImage
        }
        flyer.onerror = reject
        flyer.src = flyerBlobUrl
      } catch (error) {
        reject(error)
      }
    })
  }

  const handleGenerate = async () => {
    if (!image || !croppedAreaPixels) return

    setIsProcessing(true)
    try {
      const circularImage = await createCircularCrop(image, croppedAreaPixels)
      const finalImage = await mergeWithFlyer(circularImage)
      setPreviewUrl(finalImage)
      setShowPreview(true)
    } catch (error) {
      console.error('Error generating image:', error)
      alert('Error generating image. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const link = document.createElement('a')
    link.href = previewUrl
    link.download = `UNTIED-Youth-Camp-26-Attending-Graphics.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReset = () => {
    setImage(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setPreviewUrl(null)
    setShowPreview(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="logo animate-float" />
        </div>
        <h1 className="title glow-text">
          <span className="title-accent">UNTIED</span>
          <span className="title-divider">|</span>
          <span className="title-sub">YOUTH CAMP 26'</span>
        </h1>
        <p className="subtitle">Attending Graphics Generator</p>
      </header>

      <main className="main">
        {!showPreview ? (
          <div className="editor-container">
            {!image ? (
              <div className="upload-section glass-card">
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h2>Upload Your Photo</h2>
                <p>Select an image to place in the camp flyer</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  id="file-input"
                />
                <label htmlFor="file-input" className="upload-button">
                  Choose Image
                </label>
              </div>
            ) : (
              <div className="crop-section">
                <div className="cropper-wrapper glass-card">
                  <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>
                <div className="controls glass-card">
                  <div className="zoom-control">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="zoom-slider"
                    />
                  </div>
                  <div className="button-group">
                    <button onClick={handleReset} className="btn-secondary">
                      Reset
                    </button>
                    <button 
                      onClick={handleGenerate} 
                      disabled={isProcessing}
                      className="btn-primary"
                    >
                      {isProcessing ? 'Processing...' : 'Generate Flyer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="preview-section">
            <div className="preview-container glass-card">
              <h2>Your Camp Flyer</h2>
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Generated Flyer" 
                  className="preview-image"
                  onError={(e) => {
                    console.error('Image failed to load')
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="preview-placeholder">Loading...</div>
              )}
              <div className="preview-actions">
                <button onClick={() => setShowPreview(false)} className="btn-secondary">
                  Edit Again
                </button>
                <button onClick={handleDownload} className="btn-primary">
                  Download HD
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Holy Ghost Caucus | Dominion Camp | March 17th-19th</p>
      </footer>
    </div>
  )
}

export default App
