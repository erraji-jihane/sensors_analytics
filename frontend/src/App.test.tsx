import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

// Keep the test offline and independent of ESM-only chart/HTTP packages.
jest.mock('./api', () => ({}));
jest.mock('recharts', () => ({}));

test('renders the dashboard navigation and input form', () => {
  render(<App />);
  expect(screen.getByText(/Fault Prediction/)).toBeInTheDocument();
  expect(screen.getByText(/Similarity Search/)).toBeInTheDocument();
  expect(screen.getByText(/Model Overview/)).toBeInTheDocument();
  expect(screen.getByLabelText('RPM')).toHaveValue(2225);
});

test('sample buttons fill in the reading', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Q2'));
  expect(screen.getByLabelText('Temperature (°C)')).toHaveValue(71.5);
});
