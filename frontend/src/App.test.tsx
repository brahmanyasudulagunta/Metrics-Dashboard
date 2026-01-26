import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  render(<App />);
  // App redirects to /dashboard which redirects to /login when not authenticated
  expect(document.body).toBeTruthy();
});
