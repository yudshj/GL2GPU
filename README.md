# GL2GPU: Accelerating WebGL Applications via Dynamic API Translation to WebGPU

[![Paper @ WWW'25](https://img.shields.io/badge/WWW%2725-Accepted-blue)](https://doi.org/10.1145/3696410.3714785)
[![Demo Site](https://img.shields.io/badge/Demo-Online-green)](https://gl2gpu.hanyd.site/)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.14783703.svg)](https://doi.org/10.5281/zenodo.14783703)

[gl2gpu-demo-www25-submission-6.webm](https://github.com/user-attachments/assets/89afa4a1-52e7-429a-9e9d-128bffef9cac)

GL2GPU is a dynamic translator that boosts WebGL rendering performance by converting WebGL API calls into WebGPU at JavaScript runtime — with **no need to rewrite source code** or modify the browser. Our evaluations show up to **45% average frame time reduction** across platforms while preserving visual consistency.

---

## 🔥 Key Features

- ✅ **Dynamic Translation:** Automatically intercepts and translates WebGL calls to WebGPU in real time.
- 🚀 **Performance Boost:** Achieves significant speedups (up to 87.7% on mobile) without modifying original applications.
- 📦 **No Browser or App Modifications:** Works entirely via JavaScript runtime and prototype patching.
- 📊 **Benchmarks Validated:** Validated using MotionMark, JSGameBench, and WebGL Aquarium.
- 🧠 **Adaptive Optimizations:** Uses shader translation, render state caching, uniform batching, and bundle reuse for efficiency.

---

## 📄 How It Works

GL2GPU captures WebGL rendering commands, emulates WebGL state, and dynamically generates equivalent WebGPU shaders and descriptors. The system applies several optimization strategies:

- **WebGL State Emulation:** Tracks state changes using JavaScript prototype patching.
- **Shader Translation:** Converts GLSL to WGSL with shared variable merging.
- **Two-Level Caching:** Avoids redundant resource generation.
- **Uniform Batching:** Reduces GPU memory traffic.
- **Render Bundle Management:** Reuses WebGPU command sequences via Trie structure.

For architectural details, see our [WWW 2025 paper](https://doi.org/10.1145/3696410.3714785).

---

## 🛠 Installation

You can integrate GL2GPU into your web application as a standalone JavaScript module:

```html
<script src="path/to/gl2gpu.bundle.js"></script>
```

> Note: WebGPU support requires recent versions of Chrome (v114+) with WebGPU enabled.

------

## 🧪 Benchmarks

| Benchmark   | Avg. Frame Time Reduction |
| ----------- | ------------------------- |
| MotionMark  | 73.9% – 87.7%             |
| JSGameBench | 19.3% – 61.4%             |
| Aquarium    | 3.3% – 63.8%              |



Tested across Mac, Windows, and Android devices with various GPUs (AMD, NVIDIA, Intel, Snapdragon).

------

## 📺 Live Demo

Explore our interactive demo:
 👉 https://gl2gpu.hanyd.site/

------

## 📄 Citation

If you use GL2GPU in your research, please cite:

```bib
@inproceedings{10.1145/3696410.3714785,
    author = {Han, Yudong and Bi, Weichen and An, Ruibo and Tian, Deyu and Yang, Qi and Ma, Yun},
    title = {GL2GPU: Accelerating WebGL Applications via Dynamic API Translation to WebGPU},
    year = {2025},
    isbn = {9798400712746},
    publisher = {Association for Computing Machinery},
    address = {New York, NY, USA},
    url = {https://doi.org/10.1145/3696410.3714785},
    doi = {10.1145/3696410.3714785},
    booktitle = {Proceedings of the ACM on Web Conference 2025},
    pages = {751–762},
    numpages = {12},
    keywords = {api translation, graphics, web applications, webgl, webgpu},
    location = {Sydney NSW, Australia},
    series = {WWW '25}
}
```

------

## 👥 Contributors

- Yudong Han, Weichen Bi, Ruibo An, Deyu Tian, Qi Yang, Yun Ma
   (Peking University)

------

