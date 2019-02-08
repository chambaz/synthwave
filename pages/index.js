import SpotifyWebApi from 'spotify-web-api-node'
import axios from 'axios'
import React from 'react'

const Page = ({ track }) => {
  return <div>{track.track.name}</div>
}

Page.getInitialProps = async ({ req }) => {
  const spotifyCreds = {
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret
  }

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

  const trackData = await spotifyApi.getPlaylist('5GBJpEiKMiFy3cBPKR2TaH', {
    limit: 200
  })

  const tracks = trackData.body.tracks.items
  const track = tracks[Math.floor(Math.random() * tracks.length)]
  return { track }
}

export default Page
