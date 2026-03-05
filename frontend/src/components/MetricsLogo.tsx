import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

const MetricsLogo: React.FC<SvgIconProps> = (props) => (
    <SvgIcon {...props} viewBox="0 0 100 100">
        {/* Outer gauge arc */}
        <path
            d="M 15 75 A 42 42 0 1 1 85 75"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="6"
            strokeLinecap="round"
        />
        {/* Tick marks */}
        <line x1="18" y1="68" x2="24" y2="63" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="14" y1="50" x2="21" y2="50" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="22" y1="33" x2="28" y2="37" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="38" y1="20" x2="41" y2="27" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="50" y1="15" x2="50" y2="22" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="62" y1="20" x2="59" y2="27" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="78" y1="33" x2="72" y2="37" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="86" y1="50" x2="79" y2="50" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <line x1="82" y1="68" x2="76" y2="63" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        {/* Needle pointing ~60 degrees (healthy) */}
        <line
            x1="50" y1="62"
            x2="65" y2="30"
            stroke="#00e5ff"
            strokeWidth="3"
            strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx="50" cy="62" r="5" fill="#00e5ff" />
        <circle cx="50" cy="62" r="2.5" fill="#0d1117" />
        {/* Gradient definition */}
        <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00e5ff" />
                <stop offset="50%" stopColor="#00bcd4" />
                <stop offset="100%" stopColor="#7c4dff" />
            </linearGradient>
        </defs>
    </SvgIcon>
);

export default MetricsLogo;
