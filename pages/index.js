import { useState, useEffect, useRef } from 'react'
import SpotifyWebApi from 'spotify-web-api-node'
import axios from 'axios'

const Page = ({ spotifyTrack }) => {
  const [track, setTrack] = useState(false)
  const [spectrum, setSpectrum] = useState([])
  const [hue, setHue] = useState(0)
  const [shapes, setShapes] = useState({})
  const [restart, setRestart] = useState(false)
  const video = useRef(null)

  useEffect(() => {
    if (spectrum[4] > 200) {
      setHue(143)
      addShapeToState()
    }
    if (spectrum[8] > 200) {
      setHue(320)
      addShapeToState()
    }
    if (spectrum[10] > 200) {
      setHue(0)
      addShapeToState()
    }
  }, [spectrum])

  // clear shapes every two runs
  useEffect(() => {
    setInterval(() => {
      setShapes({})
    }, 3360)
  }, [])

  // run when track changes
  useEffect(() => {
    if (track) {
      // build artists list
      track.artistsList = []
      track.artists.forEach((artist, index) => {
        track.artistsList.push(`${artist.name}, `)
      })
      track.artistsList[track.artistsList.length - 1] = track.artistsList[
        track.artistsList.length - 1
      ].slice(0, -2)

      play()
    }
  }, [track])

  // update state with new random track
  function getRandomTrack() {
    setTrack(spotifyTrack)
  }

  // fetch preview mp3 as array buffer, pipe through web audio API, play and analyze
  function play() {
    const context = new AudioContext()
    const source = context.createBufferSource()
    const analyzer = context.createAnalyser()

    // frequency analyzer with 64 segments
    analyzer.fftSize = 128
    let dataArray = new Uint8Array(analyzer.frequencyBinCount)

    axios
      .get(track.preview_url, {
        responseType: 'arraybuffer'
      })
      .then(arrayBuffer => {
        context.decodeAudioData(arrayBuffer.data).then(audioBuffer => {
          source.buffer = audioBuffer
          source.connect(analyzer)
          analyzer.connect(context.destination)

          // play and kick of analysis
          source.start()
          video.current.play()
          // video.current.playbackRate = 1 + (track.tempo - 120) / 100
          analyze(analyzer, dataArray)

          source.onended = () => {
            setRestart(true)
            setTimeout(() => {
              window.location.reload()
            }, 3500)
          }
        })
      })
  }

  // analyze frequency spectrum
  function analyze(analyzer, dataArray) {
    analyzer.getByteFrequencyData(dataArray)

    // create array analyzer segments and update state
    let arr = []
    dataArray.slice(8, 48).forEach((bucket, index) => {
      arr[index] = bucket
    })
    setSpectrum(arr)

    requestAnimationFrame(() => {
      analyze(analyzer, dataArray)
    })
  }

  // update shape objects with new shape if less than 7 on stage
  function addShapeToState() {
    if (Object.keys(shapes).length > 6) {
      return
    }

    const index = `shape-${new Date().getTime() + randomNumber(0, 1000)}`

    requestAnimationFrame(() => {
      let shps = Object.assign({}, shapes)
      shps[index] = addShape()
      setShapes(shps)
    })
  }

  function addShape() {
    const shapeImages = [
      '/static/circle.gif',
      '/static/line.gif',
      '/static/star.gif',
      '/static/triangle.gif'
    ]

    return {
      img: shapeImages[Math.floor(Math.random() * shapeImages.length)],
      top: randomNumber(0, 35),
      left: randomNumber(0, 100),
      rotate: randomNumber(0, 360),
      width: randomNumber(20, 90),
      hueShift: randomNumber(100, 300),
      opacity: randomNumber(5, 10) / 10
    }
  }

  function randomNumber(min, max) {
    return Math.floor(Math.random() * max) + min
  }

  return (
    <div className={restart ? 'restart' : ''}>
      {Object.keys(shapes).map(key => (
        <img
          className="box"
          src={shapes[key].img}
          style={{
            top: `${shapes[key].top}%`,
            left: `${shapes[key].left}%`,
            transform: `rotate(${shapes[key].rotate}deg)`,
            width: `${shapes[key].width}px`,
            filter: `hue-rotate(${shapes[key].hueShift}deg)`,
            opacity: shapes[key].opacity
          }}
        />
      ))}
      <img
        className="image"
        src="/static/sun.png"
        style={{ display: track ? 'block' : 'none' }}
      />
      <video
        loop
        preload="true"
        ref={video}
        className="video"
        muted
        style={{ display: track ? 'block' : 'none' }}>
        <source src="/static/synthwave.mp4" type="video/mp4" />
      </video>
      <div className="info" style={{ display: track ? 'block' : 'none' }}>
        <div className="info__wrapper">
          <div className="info__image">
            {track && (
              <img className="info__img" src={track.album.images[0].url} />
            )}
          </div>
          <div className="info__content">
            {track && (
              <div>
                <h2 className="info__title">{track.name}</h2>
                <h3 className="info__artists">{track.artistsList}</h3>
              </div>
            )}
          </div>
        </div>
      </div>
      <button
        className="btn"
        onClick={e => {
          const node = e.currentTarget
          node.parentElement.removeChild(node)
          getRandomTrack()
        }}>
        Play
      </button>
      <style jsx global>{`
        body {
          background: #000;
          color: white;
          font-family: Menlo;
          height: 100vh;
          overflow: hidden;
        }

        .box {
          width: 100px;
          position: absolute;
          z-index: 2;
        }

        .image {
          position: absolute;
          width: 100%;
          height: auto;
          top: 0;
          left: 0;
          z-index: 3;
        }

        .video {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: hue-rotate(${hue}deg);
          transition: 1s;
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
          z-index: 1;
        }

        .btn {
          border: solid 1px white;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: none;
          color: white;
          padding: 20px 50px;
          text-transform: uppercase;
          font-size: 18px;
          outline: none;
          cursor: pointer;
          transition: 0.3s;
          z-index: 3;
          font-family: Menlo;
        }

        .btn:hover {
          background: white;
          color: black;
        }

        .info {
          width: 300px;
          position: absolute;
          top: 20px;
          right: 20px;
          color: white;
          opacity: 0.75;
          z-index: 3;
        }

        .info__wrapper {
          display: flex;
          background: white;
          color: black;
        }

        .info__image {
          width: 40%;
        }

        .info__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .info__content {
          padding: 10px 20px;
          width: 60%;
        }

        .info__title,
        .info__artists {
          margin: 10px 0;
        }

        .info__title {
          font-size: 16px;
        }

        .info__artists {
          font-size: 12px;
        }

        .restart {
          transition: 3s;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}

Page.getInitialProps = async ({ req }) => {
  const spotifyCreds = {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
  }

  // first get application access token
  const spotifyAccess = await axios({
    url: 'https://accounts.spotify.com/api/token',
    method: 'post',
    params: {
      grant_type: 'client_credentials'
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        spotifyCreds.clientId + ':' + spotifyCreds.clientSecret
      ).toString('base64')}`
    }
  })

  const spotifyApi = new SpotifyWebApi(spotifyCreds)
  spotifyApi.setAccessToken(spotifyAccess.data.access_token)

  // fetch Synthwave playlist
  const spotifyPlaylist = await spotifyApi.getPlaylist(
    '5GBJpEiKMiFy3cBPKR2TaH',
    {
      limit: 200
    }
  )

  // get random track from playlist
  const spotifyTracks = spotifyPlaylist.body.tracks.items
  const spotifyTrack =
    spotifyTracks[Math.floor(Math.random() * spotifyTracks.length)].track

  // get analysis of track and add beat info to track object
  const analysis = await spotifyApi.getAudioAnalysisForTrack(spotifyTrack.id)
  spotifyTrack.tempo = analysis.body.track.tempo

  return { spotifyTrack }
}

export default Page
