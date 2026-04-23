"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Timer {
    seconds = 60;
    startTime;
    constructor() {
        this.startTime = new Date();
    }
    start() {
        this.startTime = new Date();
    }
    stop() {
    }
    reset() {
    }
    timeElapsed() {
        let now = new Date();
        return now.getTime() - this.startTime?.getTime();
    }
}
async function test() {
    let t = new Timer();
    t.start();
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(t.timeElapsed());
}
test();
//# sourceMappingURL=timer.js.map