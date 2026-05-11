import { app } from "./app";
import { GracePeriodService } from "./services/grace-period-service";
const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`);
});
// Clean up grace period service on shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, cleaning up...');
    GracePeriodService.cleanup();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    console.log('Received SIGINT, cleaning up...');
    GracePeriodService.cleanup();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
