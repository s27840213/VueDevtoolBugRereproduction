"use strict";(self["webpackChunknueditor"]=self["webpackChunknueditor"]||[]).push([[972],{50972:function(e,t,l){l.r(t),l.d(t,{default:function(){return p}});var i=l(29651),s=l(819);const c={class:"hashtag-row"},a={key:0,class:"hashtag-row__title"},n={class:"hashtag-row__tags"},d=["onClick"];function h(e,t,l,h,r,o){return(0,i.wg)(),(0,i.iD)("div",c,[e.title?((0,i.wg)(),(0,i.iD)("div",a,(0,s.zw)(e.title),1)):(0,i.kq)("",!0),(0,i._)("div",n,[(0,i._)("div",{class:(0,s.C_)(["hashtag-row__tags__tag",{selected:0===e.selected.length}]),onClick:t[0]||(t[0]=(...t)=>e.handleSelectAll&&e.handleSelectAll(...t))},(0,s.zw)(e.$t("NN0324")),3),((0,i.wg)(!0),(0,i.iD)(i.HY,null,(0,i.Ko)(e.list,((t,l)=>((0,i.wg)(),(0,i.iD)("div",{class:(0,s.C_)(["hashtag-row__tags__tag",{selected:e.checkSelection(t)}]),key:l,onClick:l=>e.handleSelect(t)},(0,s.zw)(t.name),11,d)))),128))])])}var r=l(41463);const o=(0,i.aZ)({props:{defaultSelection:{type:Array,required:!0},type:{type:String,required:!0},list:{type:Array,required:!0},title:{type:String,default:""},shinkWidth:{type:Number,default:5}},mounted(){this.selected=this.defaultSelection},watch:{list(){this.selected=this.defaultSelection},defaultSelection(){this.selected=this.defaultSelection}},data(){return{selected:[]}},methods:{checkSelection(e){const t="theme"===this.type?e.id.toString():e.name;return this.selected.includes(t)},handleSelectAll(){this.selected=[],this.emitSelect()},handleSelect(e){const t="theme"===this.type?e.id.toString():e.name;this.selected=[t],this.emitSelect()},emitSelect(){this.$emit("select",{title:this.title,selection:this.selected})}}}),u=()=>{(0,r.sj)((e=>({fdb89d4c:e.shinkWidth})))},g=o.setup;o.setup=g?(e,t)=>(u(),g(e,t)):u;var _=o,S=l(53372);const f=(0,S.Z)(_,[["render",h],["__scopeId","data-v-31f09b31"],["__file","HashtagCategoryRow.vue"]]);var p=f}}]);
//# sourceMappingURL=972.a2d35407.js.map