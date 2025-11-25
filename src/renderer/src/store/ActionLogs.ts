export interface LogInfo{
    timestamp: Date;
    message: string;
    type: 'success' | 'error' | 'info';
}

export class ActionLogs{
    private logs: LogInfo[];

    constructor(){
        this.logs = []
    }

    public getLogs(): LogInfo[]{
        return this.logs
    }

    public createLog(message: string, type: 'success' | 'error' | 'info'): LogInfo[]{
        const timestamp = new Date()

        const new_log: LogInfo = {
            timestamp,
            message,
            type
        }

        this.logs.push(new_log)
        return this.logs
    }
}

export const actionLogs = new ActionLogs()