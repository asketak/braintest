import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry';
import './App.css';

function App() {

    const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [fileContent, setFileContent] = useState('');
  const ws = useRef(null);
  const incomingMessage = useRef('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
    ws.current.onmessage = (event) => {
      // Use the ref to update the current incoming message
      console.log("---" + incomingMessage.current+ "---")
      if (incomingMessage.current === '') {
        console.log("inempty")
         incomingMessage.current += event.data;
        setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: incomingMessage.current }]);
      }else{
        incomingMessage.current += event.data;
        //  const updatedMessages = messages.slice(0, -1);
        //  const updatedMessages = messages.slice(1, 0);
        //  console.log(updatedMessages)
        //  setMessages([...updatedMessages, { role: 'assistant', content: incomingMessage.current }]);
        setMessages(prevMessages => {
        const updatedMessages = prevMessages.slice(0, -1);
        return [...updatedMessages, { role: 'assistant', content: incomingMessage.current }];
      });
      // Directly update the messages state
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []); // Empty dependency array to ensure this effect runs only once

    const handleFileUpload = event => {
    const file = event.target.files[0];
    if (file) {
      const fileType = file.type;
      if (fileType.includes('csv')) {
        readCSVFile(file);
      } else if (fileType.includes('pdf')) {
        readPDFFile(file);
      }
    }
  };

  const readCSVFile = file => {
    const reader = new FileReader();
    reader.onload = e => {
      setFileContent(e.target.result);
    };
    reader.readAsText(file);
  };

  const readPDFFile = async file => {
    const reader = new FileReader();
    reader.onload = async e => {
      const typedArray = new Uint8Array(e.target.result);
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
      let textContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const text = await page.getTextContent();
        textContent += text.items.map(item => item.str).join(' ');
      }
      setFileContent(textContent);
    };
    reader.readAsArrayBuffer(file);
  };

  const sendMessage = () => {
    if (ws.current && (input.trim() || fileContent)) {
      const messageToSend = input + ' ' + fileContent;
      const msg = { role: 'user', content: messageToSend }
      messages.push(msg)
      // setMessages(prevMessages => [...prevMessages, msg]);
      console.log(messageToSend)
      ws.current.send(JSON.stringify(messages));
      setInput('');
      setFileContent('');
      incomingMessage.current = '';
    }
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1> IBM SDK assistant </h1>
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.content}
            </div>
          ))}
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
                <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ margin: '10px 0' }}
        />
        <button onClick={sendMessage}>Send</button>
      </header>
    </div>
  );
}

export default App;
