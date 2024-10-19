import React from 'react';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
const Typewrite = () => {
  const [text] = useTypewriter({
    words: ['Green House Monitoring'],
    loop: true,
    delaySpeed : 10000
  });

  return (
    <>
    <div>
    <span className="text-center text-green-500 font-bold mt-2 text-5xl">
      {text}
      <Cursor
        cursorStyle='|'
        cursorColor='green'
        cursorBlinking='true'
      />
    </span>
    </div>
   
    </>
  );
};

export default Typewrite;