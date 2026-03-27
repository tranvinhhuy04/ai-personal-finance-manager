const express = require('express');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.all('*', (_req, res) => {
  res.status(404).json({ message: 'service-wallet stub: not implemented' });
});

app.listen(PORT, () => {
  console.log(`service-wallet running on port ${PORT}`);
});

