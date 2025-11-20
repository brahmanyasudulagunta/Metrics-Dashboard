import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export default function ChartPanel({data, title}){
  const formatted = data.map(d => ({time: d.t.toLocaleTimeString(), value: d.v}))
  return (
    <div style={{width: '800px', height: '300px', background:'#fff', padding:12, borderRadius:8}}>
      <h3>{title}</h3>
      <LineChart width={780} height={250} data={formatted}>
        <XAxis dataKey="time"/>
        <YAxis/>
        <Tooltip/>
        <CartesianGrid stroke="#f5f5f5"/>
        <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false}/>
      </LineChart>
    </div>
  )
}
