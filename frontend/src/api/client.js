import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getPersonas = () => api.get('/personas').then(r => r.data)
export const startBetaTest = (data) => api.post('/test/beta', data).then(r => r.data)
export const startCompetitorTest = (data) => api.post('/test/competitor', data).then(r => r.data)
export const getJob = (jobId) => api.get(`/jobs/${jobId}`).then(r => r.data)

export const startSwarmTest = (data) => api.post('/test/swarm', data).then(r => r.data)
export const getSwarm = (swarmId) => api.get(`/swarms/${swarmId}`).then(r => r.data)

export function connectJobWS(jobId, onMessage) {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${window.location.host}/ws/${jobId}`)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  return ws
}
