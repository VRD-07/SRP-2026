import app from './app';
import { ENV } from './config/env';

const PORT = ENV.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 College Fees ERP Backend running on http://localhost:${PORT}`);
  console.log(`⚡ Environment: ${ENV.NODE_ENV}`);
});

export default app;
