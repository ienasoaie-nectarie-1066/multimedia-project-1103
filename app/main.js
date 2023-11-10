//tells getUserMedia to only allow audio and ask for audio permission
let constraintsObj ={
    audio: true,
    video: false
}
//checks for various APIs in safari and mozzila (i think)
if(navigator.mediaDevices === undefined){
    navigator.mediaDevices = {}
    navigator.mediaDevices.getUserMedia = (constraints)=>{
        let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia
        //if the browser has no media api
        if(!getUserMedia){
            //return error
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
        }
        return new Promise(()=>{
            //in any other case, return this
            getUserMedia.call(navigator,constraints,resolve,reject)
        })
    }
}
//if the default browser api exists and is reachable
else{
    //show the devices available for input and output
    navigator.mediaDevices.enumerateDevices()
        .then(devices=>{
            devices.forEach(device=>{
                console.log(device.kind.toUpperCase(), device.label)
            })
        })
        .catch(err=>{
            console.log(err.name, err.message)
        })
}
const rec = document.getElementById('recordingAndDuration')
navigator.mediaDevices.getUserMedia(constraintsObj)
    .then((mediaStreamObj)=>{
        //look for audio elements in the html 
        let audio = document.querySelector('audio')
        //modern version, get the media object as a source for the audio
        if('srcObject' in audio){
            audio.srcObject = mediaStreamObj
        }
        //same thing, just with URLs instead of objects
        else{
            audio.src = window.URL.createObjectURL(mediaStreamObj)
        }
        //plays the audio as it is being recorded, not really necessary (would've used audio1 in html)
        /*audio.onloadedmetadata = (ev) =>{
            audio.play();
        }*/
        //grab the buttons and the audio element to which we save the data
        let start = document.getElementById('startRec')
        let stop = document.getElementById('stopRec')
        let audioSave = document.getElementById('audio2')
        //instantiate media recorder with the mediaStreamObj we get as a promise form .getUserMedia
        let mediaRecorder = new MediaRecorder(mediaStreamObj)
        //the data gets sent as chunks, much like file reading
        let audioChunks = []

        //Web Audio API SETUP
        const AudioContext = window.AudioContext || window.webkitAudioContext
        const audioCtx = new AudioContext();
        //-------------------

        //Canvas API SETUP & drawing function
        const canvas = document.getElementById('canvas')
        const canvasCtx = canvas.getContext('2d')
        function startDrawing(){
            analyser.fftSize = 1024
            let bufferSize = analyser.frequencyBinCount
            let dataArray = new Uint8Array(bufferSize)
            canvasCtx.lineWidth = 2
            function draw(){
                canvasCtx.clearRect(0,0,canvas.width, canvas.height)
                requestAnimationFrame(draw)

                analyser.getByteTimeDomainData(dataArray)
                canvasCtx.beginPath()
                for(let x = 0; x < bufferSize; x++){
                    let y = 299-dataArray[x];
                    canvasCtx.lineTo(x, y);
                  }
                  canvasCtx.closePath();
                  canvasCtx.stroke();
            }
            draw()
        }
        //NODES
        //gainNode is used to control gain (volume)
        const gainNode = audioCtx.createGain()
        //stereo panner (mono-left; stereo; mono-right)
        const pannerOptions = { pan:0 }
        const panner = new StereoPannerNode(audioCtx, pannerOptions)
        //analyzer
        const analyser = audioCtx.createAnalyser()
        analyser.smoothingTimeConstant = 0.9
        //filters
        //biquad
        /*const biquadOptions = {
            type: 'lowshelf',
            frequency:{value: 1000},
            gain:{value:25}
        }
        const biquadFilter = new BiquadFilterNode(audioCtx, biquadOptions)*/
        //no clue if this works
        //reverb w/ all the fancy tricks
        /*function base64ToArrayBuffer(base64) {
            var binaryString = window.atob(base64);
            var len = binaryString.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++)        {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
        }
        const reverbNode = audioCtx.createConvolver()
        audioCtx.decodeAudioData(track,(buffer)=>{
            reverbNode.buffer = buffer
        })*/
        //-----

        //CONNECTION FROM SOURCE TO DESTINATION
        const track = audioCtx.createMediaElementSource(audioSave)
        //connect source and additional nodes to the destination (src = track / dest = argument for connect)
        track.connect(gainNode).connect(panner).connect(analyser).connect(audioCtx.destination)
        //-------------------------------------

        //function to log the length of a recording as the audio element doesn't do that very well
        let i=0
        let curr
        function updateUi(){
            setInterval(()=>{
                if(mediaRecorder.state === 'recording'){
                    rec.innerText = `Rec... | Duration: ${i} seconds`
                    i++
                    curr = i
                }
                else{
                    rec.innerText = `Stand-by | Duration: ${i} seconds`
                }
            },1000)
        }
        
        //self explanatory ----------------------------------------------------------------
        start.addEventListener('click',(ev)=>{
            mediaRecorder.start()
            startDrawing()
            console.log(mediaRecorder.state)
            i=0
        })
        stop.addEventListener('click',(ev)=>{
            mediaRecorder.stop()
            console.log(mediaRecorder.state)
            rec.innerText = `Rec... | Duration: ${curr} seconds`
        })
        //---------------------------------------------------------------------------------
        //as soon as something is recorded, push it to the array
        mediaRecorder.ondataavailable = (ev)=>{
            audioChunks.push(ev.data)
        }
        //when recording is finished, make a media storage blob of mp3 type with the data from the array
        //enables downloading of the audiofile
        mediaRecorder.onstop = (ev) =>{
            let blob = new Blob(audioChunks, {'type':'audio/mp3;'})
            audioChunks = []
            let audioUrl = window.URL.createObjectURL(blob)
            //when saving, redirect to the blob
            audioSave.src = audioUrl;
        }
        updateUi()

        //Play/Pause btn functionality
        let pp = document.getElementById('playPause')
        pp.addEventListener('click',()=>{
            if(audioCtx.state === 'suspended'){
                audioCtx.resume()
            }
            if(pp.dataset.playing === 'false'){
                audioSave.play()
                pp.dataset.playing = 'true'
                startDrawing()
            }
            else if(pp.dataset.playing === 'true'){
                audioSave.pause()
                pp.dataset.playing ='false'
            }
        },false)

        audioSave.addEventListener('ended',()=>{
            pp.dataset.playing = 'false'
        }, false)
        
        //Volume bar functionality
        const vBar = document.getElementById('volumeBar')
        vBar.addEventListener('input',()=>{
            gainNode.gain.value = vBar.value
        },false)

        //Panner bar functionality
        const pBar = document.getElementById('pannerBar')
        pBar.addEventListener('input',()=>{
            panner.pan.value = pBar.value
        },false)
    })  
    .catch((err)=>{
        console.log(err.name, err.message)
    })
//this hides the audio1 audio element as deleting it breaks everything
document.getElementById('audio1').hidden = true
