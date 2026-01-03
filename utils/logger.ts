
import winston from 'winston';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'info';
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

// For production, we usually want JSON logging for easier parsing by aggregators
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const transports = [
    new winston.transports.Console({
        // Use simple format for dev, JSON for prod
        format: process.env.NODE_ENV === 'production' ? jsonFormat : format
    }),
    // Add file transports if needed, but stdout is usually preferred for containerized apps
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: jsonFormat
    }),
    new winston.transports.File({
        filename: 'logs/all.log',
        format: jsonFormat
    }),
];

const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
});

export default logger;
