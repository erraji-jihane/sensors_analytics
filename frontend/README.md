# Sensor Analytics — Dashboard

React + TypeScript dashboard for the sensor analytics pipeline. See the [project README](../ReadMe.md) for the full picture.

```bash
npm install
npm start        # http://localhost:3000
npm test
```

The dashboard calls the API at `http://localhost:3001` by default. To point it elsewhere, set `REACT_APP_API_URL` before starting or building, e.g. `REACT_APP_API_URL=https://my-api.example.com npm run build`.
