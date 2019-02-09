import { useState, useEffect, useRef } from 'react'
import SpotifyWebApi from 'spotify-web-api-node'
import axios from 'axios'
import shuffle from 'shuffle-array'

let trackNum = 0

const Page = ({ track }) => {
  const [spectrum, setSpectrum] = useState([])
  const [bg, setBg] = useState('#000000')
  const video = useRef(null)
  const artists = []

  useEffect(() => {
    if (spectrum[4] > 200) {
      setBg('#333333')
    } else {
      setBg('#000000')
    }
  }, [spectrum])

  // build artists list
  track.artistsList = []
  track.artists.forEach((artist, index) => {
    track.artistsList.push(`${artist.name}, `)
  })
  track.artistsList[track.artistsList.length - 1] = track.artistsList[
    track.artistsList.length - 1
  ].slice(0, -2)

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
          analyze(analyzer, dataArray)
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

  return (
    <div>
      <video
        loop
        ref={video}
        className="video"
        muted
        style={{ display: track ? 'block' : 'none' }}>
        <source
          src="https://fpdl.vimeocdn.com/vimeo-prod-src-std-us/videos/a436923734fa43bcaf4b77644ca55f28?token=1549702538-0x97c9cc1bcc7ce3e8fe77d9c255e06a831867ab61"
          type="video/mp4"
        />
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
          play()
        }}>
        Play
      </button>
      <style jsx global>{`
        body {
          background: ${bg};
          color: white;
          font-family: Menlo;
          transition: 0.3s;
        }

        .video {
          position: fixed;
          right: 0;
          bottom: 0;
          min-width: 100%;
          min-height: 100%;
          width: 1000px;
          height: auto;
          z-index: -100;
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
          opacity: 0.5;
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
  const trackData = await spotifyApi.getPlaylist('5GBJpEiKMiFy3cBPKR2TaH', {
    limit: 200
  })

  // get random tracks from playlist and shuffle
  const tracks = trackData.body.tracks.items
  shuffle(tracks)

  // find track between -8dB and -4dB overall loudness
  const track = await findLoudTracks(spotifyApi, tracks)

  return { track }
}

// loop through tracks and return one between -8dB and -4dB overall loudness
async function findLoudTracks(spotifyApi, tracks) {
  const analysis = await spotifyApi.getAudioAnalysisForTrack(
    tracks[trackNum].track.id
  )

  if (analysis.body.track.loudness > -8 && analysis.body.track.loudness < -4) {
    return tracks[trackNum].track
  }

  trackNum++
  if (trackNum <= tracks.length - 1) {
    return findLoudTracks(spotifyApi, tracks)
  }

  return false
}

export default Page
