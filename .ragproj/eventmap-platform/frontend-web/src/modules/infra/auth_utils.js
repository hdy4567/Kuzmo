/**
 * 🔐 [AUTH-UTILS] Google API Loader & Helper
 */

export async function waitForScripts() {
    return new Promise((resolve) => {
        const check = () => {
            if (window.gapi && window.google) {
                resolve();
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
}

export async function startGapi(apiKey, clientId) {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', async () => {
            try {
                await gapi.client.init({
                    apiKey: apiKey,
                    clientId: clientId,
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
                    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata",
                    plugin_name: "Kuzmo"
                });
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}
