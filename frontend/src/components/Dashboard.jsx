import React, {useEffect, useState} from 'react'
import axios from 'axios'
import ChartPanel from './ChartPanel'

export default function Dashboard(){
  const [series, setSeries] = useState([])

  useEffect(() => {
    fetchCPU()
    const t = setInterval(fetchCPU, 15000)
    return () => clearInterval(t)
  },[])

  async function fetchCPU(){
    try{
      const resp = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/metrics/cpu`)
      // transform Prometheus response to simple time series for ChartPanel
      const data = [] // transform below
      if(resp.data && resp.data.data && resp.data.data.result){
        const points = resp.data.data.result[0]?.values || []
        const formatted = points.map(p => ({t: new Date(p[0]*1000), v: parseFloat(p[1])}))
        setSeries(formatted)
      }
    } catch(e){
      console.error(e)
    }
  }

  return (
    <div style={{padding:20}}>
      <h2>DevOps Monitoring Dashboard</h2>
      <ChartPanel data={series} title="CPU (avg rate)" />
    </div>
  )
}
