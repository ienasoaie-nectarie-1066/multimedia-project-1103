let constraintsObj ={
    audio: true,
    video: false
}
if(navigator.mediaDevices === undefined){
    navigator.mediaDevices = {}
    navigator.mediaDevices.getUserMedia = (constraints)=>{
        let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia
        if(!getUserMedia){
            return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
        }
        return new Promise(()=>{
            getUserMedia.call(navigator,constraints,resolve,reject)
        })
    }
}
else{
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
        let audio = document.querySelector('audio')
        if('srcObject' in audio){
            audio.srcObject = mediaStreamObj
        }
        else{
            audio.src = window.URL.createObjectURL(mediaStreamObj)
        }

        audio.onloadedmetadata = (ev) =>{
            audio.play();
        }

        let start = document.getElementById('startRec')
        let stop = document.getElementById('stopRec')
        let audioSave = document.getElementById('audio2')
        let mediaRecorder = new MediaRecorder(mediaStreamObj)
        let audioChunks = []
        
        let i=0
        let curr
        function updateUi(){
            setInterval(()=>{
                if(mediaRecorder.state === 'recording'){
                    rec.innerText = `Rec... | Duration: ${i} seconds`
                    i++
                    curr = i
                }
            },1000)
        }
        

        start.addEventListener('click',(ev)=>{
            mediaRecorder.start()
            console.log(mediaRecorder.state)
            i=0
        })
        stop.addEventListener('click',(ev)=>{
            mediaRecorder.stop()
            console.log(mediaRecorder.state)
            rec.innerText = `Rec... | Duration: ${curr} seconds`
        })
        mediaRecorder.ondataavailable = (ev)=>{
            audioChunks.push(ev.data)
        }
        mediaRecorder.onstop = (ev) =>{
            let blob = new Blob(audioChunks, {'type':'audio/mp3;'})
            audioChunks = []
            let audioUrl = window.URL.createObjectURL(blob)
            audioSave.src = audioUrl;
        }
        updateUi()
        
    })  
    .catch((err)=>{
        console.log(err.name, err.message)
    })

let audio1 = document.getElementById('audio1')
audio1.muted = true
audio1.hidden = true;
