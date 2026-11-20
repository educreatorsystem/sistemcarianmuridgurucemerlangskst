/* Small compatibility helpers for older tablet browsers. */
(function(){
 'use strict';
 if(!Promise.allSettled)Promise.allSettled=function(items){return Promise.all(Array.from(items).map(function(item){return Promise.resolve(item).then(function(value){return {status:'fulfilled',value:value};},function(reason){return {status:'rejected',reason:reason};});}));};
 var dialogs=document.querySelectorAll('dialog');
 for(var i=0;i<dialogs.length;i++){
  if(typeof dialogs[i].showModal!=='function')dialogs[i].showModal=function(){this.setAttribute('open','');};
  if(typeof dialogs[i].close!=='function')dialogs[i].close=function(){this.removeAttribute('open');};
  if(!('open' in dialogs[i]))Object.defineProperty(dialogs[i],'open',{get:function(){return this.hasAttribute('open');},set:function(value){if(value)this.setAttribute('open','');else this.removeAttribute('open');}});
 }
})();
