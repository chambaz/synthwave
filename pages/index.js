import { useState } from 'react'
import SpotifyWebApi from 'spotify-web-api-node'
import axios from 'axios'

const Page = ({ track }) => {
  const [spectrum, setSpectrum] = useState([])
  const artists = []
  const buckets = []

  // build artists list
  track.artists.forEach((artist, index) => {
    artists.push(<li key={index}>{artist.name}</li>)
  })

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

    // frequency analyzer with 128 segments
    analyzer.fftSize = 256
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

    // create array from middle 32 analyzer segments and update state
    let arr = []
    dataArray.slice(48, 80).forEach((bucket, index) => {
      arr[index] = bucket
    })
    setSpectrum(arr)

    requestAnimationFrame(() => {
      analyze(analyzer, dataArray)
    })
  }

  return (
    <div>
      <h1>Track Info</h1>
      <ul>
        <li>Song: {track.name}</li>
        <li>
          Artists:
          <ul>{artists}</ul>
        </li>
      </ul>
      <button onClick={() => play(track)}>Play</button>
      {spectrum.length > 0 && <h2>Analysis</h2>}
      <ul className="spectrum">{buckets}</ul>
      <style jsx global>{`
        .spectrum {
          display: flex;
          height: 200px;
          margin: 0;
          padding: 0;
        }

        .spectrum__segment {
          background: gray;
          display: flex;
          align-items: flex-end;
          height: 100%;
          width: 20px;
        }

        .spectrum__bar {
          background: black;
          display: block;
          width: 100%;
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
