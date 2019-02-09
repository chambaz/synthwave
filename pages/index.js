import { useState } from 'react'
import SpotifyWebApi from 'spotify-web-api-node'
import axios from 'axios'

const Page = ({ track }) => {
  const [spectrum, setSpectrum] = useState([])
  const artists = []
  const buckets = []

  track.artists.forEach((artist, index) => {
    artists.push(<li key={index}>{artist.name}</li>)
  })

  spectrum.forEach((bucket, index) => {
    buckets.push(<li key={index}>{bucket}</li>)
  })

  // fetch preview mp3 as array buffer, pipe through web audio API, play and analyze
  function play(track) {
    const context = new AudioContext()
    const source = context.createBufferSource()
    const analyzer = context.createAnalyser()

    analyzer.fftSize = 32
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

    // create array from analyzer output and update state
    let arr = []
    dataArray.forEach((bucket, index) => {
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
      <ul>{buckets}</ul>
    </div>
  )
}

Page.getInitialProps = async ({ req }) => {
  const spotifyCreds = {
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret
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
