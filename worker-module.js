// A module worker loaded from a URL: how HistoFlow starts its scheduler and kernel workers.
import { probe } from './probe-core.js';

probe().then((result) => postMessage(result));
