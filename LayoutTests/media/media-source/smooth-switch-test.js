let source;
let sourceBuffer;
let initSegment;

const TRACK_ID = 1;
const QUEUE_DEPTH_UNLIMITED = -1;

if (window.internals)
    internals.initializeMockMediaSource();

async function showEnqueuedSamples() {
    consoleWrite("Enqueued samples:");
    (await internals.enqueuedSamplesForTrackID(sourceBuffer, TRACK_ID)).forEach(consoleWrite);
}
async function showBufferedSamples() {
    consoleWrite("Buffered samples:");
    (await internals.bufferedSamplesForTrackId(sourceBuffer, TRACK_ID)).forEach(consoleWrite);
}
async function sourceBufferAppend(generation, timeRanges) {
    run(`sourceBuffer.appendBuffer(gops(${generation}, ${JSON.stringify(timeRanges)}))`);
    await waitFor(sourceBuffer, 'updateend');
}
function gops(generation, timeRanges) {
    const samples = [];
    for (let [start, end] of timeRanges) {
        for (let t = start; t < end; t++)
            samples.push(makeASample(t, t, 1, 1, TRACK_ID, t == start ? SAMPLE_FLAG.SYNC : SAMPLE_FLAG.NONE, generation));
    }
    return concatenateSamples(samples);
}
async function sourceBufferAppendGopContinuation(generation, timeRange) {
    run(`sourceBuffer.appendBuffer(gopContinuation(${generation}, ${JSON.stringify(timeRange)}))`);
    await waitFor(sourceBuffer, 'updateend');
}
function gopContinuation(generation, timeRange) {
    const samples = [];
    const [start, end] = timeRange;
    for (let t = start; t < end; t++)
        samples.push(makeASample(t, t, 1, 1, TRACK_ID, SAMPLE_FLAG.NONE, generation));
    return concatenateSamples(samples);
}
function smoothSwitchTest(callback) {
    window.addEventListener('load', async () => {
        findMediaElement();
        source = new MediaSource();
        testExpected('source.readyState', 'closed');
        const sourceOpened = waitFor(source, 'sourceopen');

        const videoSource = document.createElement('source');
        videoSource.type = 'video/mock; codecs=mock';
        videoSource.src = URL.createObjectURL(source);
        video.appendChild(videoSource);

        await sourceOpened;
        run('sourceBuffer = source.addSourceBuffer("video/mock; codecs=mock")');
        initSegment = makeAInit(10, [makeATrack(1, 'mock', TRACK_KIND.VIDEO)]);
        run('sourceBuffer.appendBuffer(initSegment)');
        await waitFor(sourceBuffer, 'updateend');

        await callback();
        endTest();
    });
}