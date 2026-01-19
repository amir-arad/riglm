
# RigLM Brand Guide

## 1. Brand Essence & Voice

**The Core Shift:** RigLM is an intelligent router ("a switchboard"). The branding reflects precision, control, and architectural power.

**Voice & Tone:**

* **Confident:** We don't guess; we configure.
* **Technical:** We speak to engineers in their language.
* **Efficient:** No fluff. High signal-to-noise ratio.

**Messaging:**

| **Type**      | **Tagline**                                                                     |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Primary**   | The Intelligent Context Router for AI.                                                |
| **Secondary** | The central multiplexer for your MCP ecosystem.                                       |
| **The Hook**  | Define extensions once. Route fine-grained context subsets to any client dynamically. |

---

## 2. Visual Identity: The Logo

We selected the **`{Ξ}`** symbol. It is a powerful, ASCII-native representation of the product's core function.

### The Deconstruction

* **The Scope `{ }`:** The curly braces represent configuration, containment, and code blocks. It grounds the tool in software engineering.
* **The Multiplexer `Ξ` (Xi):** The three horizontal lines represent parallel data streams. It visually communicates a "switchboard," "stack," or a filter grate, emphasizing the many-to-many routing capability.

### Usage Variants

**A. The Terminal Standard (ASCII)**

For CLI outputs, logs, and plain text documentation.

**Plaintext**

```
{Ξ}
```

**B. The Wordmark Lockup**

For headers and websites.

**Plaintext**

```
{Ξ} RigLM
```

**C. The Graphical Treatment (Recommended for Web/UI)**

When rendered graphically, the braces should be neutral, and the internal `Ξ` should carry the brand energy (gradient).

> **{** `<span style="background: linear-gradient(to right, #00F0FF, #7B61FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold;">`Ξ **}**

---

## 3. The Color System: "Neon Infrastructure"

A dark-mode palette built on reliable, deep backgrounds highlighted by energetic data streams.

### The Foundation (Backgrounds)

These provide the "industrial" feel.

* **Void Black:** `#0A0E17` (Main background)
* **Rack Gray:** `#161B22` (Secondary containers, sidebars)

### The Energy (Accents)

Used for the `Ξ` symbol, primary buttons, and active states.

* **Electric Cyan:** `#00F0FF` (Primary brand color. High energy, data flow.)
* **Synthetik Purple:** `#7B61FF` (Secondary accent. Intelligence, depth.)
* *(Pro Tip: Use a horizontal gradient from Cyan to Purple for maximum "cool" factor on the logo or main headers.)*

### Functional

* **Terminal White:** `#F0F6FC` (Primary text)
* **Comment Gray:** `#8B949E` (Secondary text, subtle borders)

---

## 4. Typography

A professional open-source stack that balances readability with a technical aesthetic.

* **Headers & Branding:**  **Space Grotesk** . (Bold, tech-forward sans-serif).
* **UI & Body Text:**  **Inter** . (Clean, highly legible standard).
* **Code & Data:**  **JetBrains Mono** . (The definitive developer font).

---

## 5. Application Example: The README Header

This is how we bring it all together. This header immediately establishes the "cool" factor with ASCII art, then uses the brand voice to explain the "switchboard" concept clearly.

*(Copy and paste the block below directly into your `README.md`)*

**Markdown**

```
<div align="center">

<pre style="font-family: 'JetBrains Mono', monospace; color: #00F0FF; line-height: 1.2;">
   {Ξ}
  RigLM
</pre>

# The Intelligent Context Router for AI

[![License: ISC](https://img.shields.io/badge/License-ISC-0A0E17.svg?style=flat-square&labelColor=161B22&color=8B949E)](https://opensource.org/licenses/ISC)
[![MCP Ready](https://img.shields.io/badge/MCP-Ready-0A0E17.svg?style=flat-square&labelColor=161B22&color=00F0FF)]()
[![Status: Active](https://img.shields.io/badge/Status-Active-0A0E17.svg?style=flat-square&labelColor=161B22&color=22C55E)]()

<p style="font-size: 1.1em; color: #8B949E; max-width: 600px; margin: auto;">
The central multiplexer for your Model Context Protocol ecosystem. Define your tools once, then dynamically route fine-grained context subsets to any client or session.
</p>

<br/>

<a href="#getting-started"><img src="https://img.shields.io/badge/Get_Started-%E2%86%92-00F0FF?style=for-the-badge&labelColor=0A0E17&color=00F0FF" alt="Get Started"></a>
<a href="#documentation"><img src="https://img.shields.io/badge/Documentation-%7B%CE%9E%7D-7B61FF?style=for-the-badge&labelColor=0A0E17&color=7B61FF" alt="Documentation"></a>

</div>

---

### The Switchboard Philosophy

RigLM is not just an aggregator; it is an active routing layer.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#0A0E17', 'edgeLabelBackground':'#161B22', 'tertiaryColor': '#161B22'}}}%%
graph LR
    subgraph INPUTS ["How you define them"]
        A[🛢️ Prod DB] :::mcp
        B[📁 Filesystem] :::mcp
        C[💬 Slack History] :::mcp
    end

    subgraph RIGLM ["{Ξ} RigLM Router"]
        Router[Context Multiplexer] :::router
    end

    subgraph OUTPUTS ["How you use them"]
        Session1("Session A: Junior Dev (Cursor)") :::session
        Session2("Session B: Architect (Claude)") :::session
    end

    A -.->|Full Context| Router
    B ====>|Full Context| Router
    C ====>|Full Context| Router

    Router ==="Filtered Subset (Read Only)"==> Session1
    Router ===="Full R/W Access"====> Session2

    classDef mcp fill:#161B22,stroke:#00F0FF,color:#fff,stroke-width:1px;
    classDef router fill:#0A0E17,stroke:#7B61FF,color:#00F0FF,stroke-width:2px,stroke-dasharray: 5 5;
    classDef session fill:#161B22,stroke:#8B949E,color:#fff;
    linkStyle 3,4 stroke:#00F0FF,stroke-width:2px;
    linkStyle 0,1,2 stroke:#8B949E,stroke-width:1px;
```
