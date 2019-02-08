import SpotifyWebApi from 'spotify-web-api-node'
import axios from 'axios'
import React from 'react'

export default class Child extends React.Component {
  // fetch random track from Spotify Synthwave playlist as props
  static async getInitialProps({ req }) {
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

    return { track }
  }

  // pipe preview MP3 through WebAudio
  play() {
    const context = new AudioContext()
    const source = context.createBufferSource()
    axios
      .get(this.props.track.preview_url, {
        responseType: 'arraybuffer'
      })
      .then(arrayBuffer => {
        context.decodeAudioData(arrayBuffer.data).then(audioBuffer => {
          source.buffer = audioBuffer
          source.connect(context.destination)
          source.start()
        })
      })
  }

  render() {
    const artists = []
    this.props.track.artists.forEach((artist, index) => {
      artists.push(<li key={index}>{artist.name}</li>)
    })

    return (
      <div>
        <ul>
          <li>Song: {this.props.track.name}</li>
          <li>
            Artists:
            <ul>{artists}</ul>
          </li>
          <li>{this.props.track.preview_url}</li>
        </ul>
        <button onClick={this.play.bind(this)}>Play</button>
      </div>
    )
  }
}
