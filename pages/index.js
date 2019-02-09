import { useState } from 'react'
import SpotifyWebApi from 'spotify-web-api-node'
import axios from 'axios'

const Page = ({ track }) => {
  const [spectrum, setSpectrum] = useState([])
  const buckets = []
  let artists = []

  // build artists list
  track.artists.forEach((artist, index) => {
    artists.push(`${artist.name}, `)
  })
  artists[artists.length - 1] = artists[artists.length - 1].slice(0, -2)

  // build frequency spectrum visual
  spectrum.forEach((bucket, index) => {
    buckets.push(
      <li key={index} className="spectrum__segment">
        <span
          className="spectrum__bar"
          style={{ height: `${(bucket / 255) * 100}%` }}
        />
      </li>
    )
  })

  // fetch preview mp3 as array buffer, pipe through web audio API, play and analyze
  function play(track) {
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
      <div className="info">
        <div className="info__image">
          <img className="info__img" src={track.album.images[0].url} />
        </div>
        <div className="info__content">
          <h2 className="info__title">{track.name}</h2>
          <h3 className="info__artists">{artists}</h3>
        </div>
      </div>
      <button className="btn" onClick={() => play(track)}>
        Play
      </button>
      <style jsx global>{`
        body {
          background: black;
          color: white;
          font-family: Menlo;
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
          display: flex;
          width: 300px;
          position: absolute;
          top: 20px;
          right: 20px;
          background: white;
          color: black;
          opacity: 0.5;
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

  // get random track from playlist
  const tracks = trackData.body.tracks.items
  const track = tracks[Math.floor(Math.random() * tracks.length)].track

  // get analysis of track and add beat info to track object
  const analysis = await spotifyApi.getAudioAnalysisForTrack(track.id)
  track.beats = analysis.body.beats
  track.tempo = analysis.body.track.tempo

  return { track }
}

export default Page
