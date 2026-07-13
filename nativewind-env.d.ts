/// <reference types="nativewind/types" />

// NativeWind/Metro handles importing global.css at build time; TS just
// needs to know the side-effect import is valid.
declare module '*.css';
