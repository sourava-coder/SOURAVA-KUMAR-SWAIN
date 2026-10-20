/* Set this to the deployed API origin when the static site and API use different domains. */
var localHost = window.location.hostname;
var localApi = localHost === "localhost" || localHost === "127.0.0.1";
window.PORTFOLIO_API_BASE = localApi ? "http://localhost:3000" : "https://sourava-kumar-swain-api.com";
