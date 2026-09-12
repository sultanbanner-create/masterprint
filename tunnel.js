const localtunnel = require('localtunnel');

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000, subdomain: 'masterprint-erp' });
    console.log('ONLINE_URL_READY:' + tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err.message);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
