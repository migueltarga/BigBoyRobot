module.exports = function (msg){
  return new Promise((resolve, reject) => {
      if(msg.text){
        msg.text = msg.text.replace(/(?=[^\d])\.(?=[^\d])/g, '').trim();
      }
       resolve(msg);
   });
};
