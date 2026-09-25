import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Code2, EyeOff, FileCode2, Files, Fingerprint, Folder, KeyRound, Lock, Network, ShieldCheck, Sparkles, TerminalSquare, Workflow, Copy } from 'lucide-react'
import './styles.css'
import './docs.css'
import architectureSource from '../programs/sarrun/ARCHITECTURE.md?raw'
import joinSplitSource from '../circuits/JoinSplit.circom?raw'
import noteSource from '../sdk/note.js?raw'
import merkleSource from '../sdk/merkle.js?raw'
import proofSource from '../sdk/proof.js?raw'
import paymentSource from '../sdk/payment.js?raw'
import clientSource from './solana-client.js?raw'
import protocolSource from './protocol.js?raw'
import deploymentSource from '../deployments/solana-mainnet.json?raw'
import securitySource from '../SECURITY.md?raw'
import readmeSource from '../README.md?raw'

const X_URL = 'https://x.com/sarruncash'
const BASE = import.meta.env.BASE_URL
function Logo(){return <a className="docs-logo" href={BASE}><span><img src={`${BASE}sarrun-logo-transparent.png`} alt="" /></span><b>sarrun</b><i>/docs</i></a>}
function XBrand(){return <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.724-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>}
function Status({children,warn=false}){return <span className={'doc-status '+(warn?'warn':'')}>{children}</span>}
const nav=[['overview','Overview'],['repository','Repository'],['architecture','Architecture'],['state','State model'],['program','Program boundary'],['proofs','Proof system'],['threats','Threat model'],['verification','Verification']]
const lifecycle=[['01','Shield','SOL and a one-time public key create a value-bound private commitment.'],['02','Receive','An X25519 receiving address delivers an authenticated encrypted note.'],['03','Transfer','A JoinSplit proof consumes one note and creates recipient and change commitments.'],['04','Exit','A valid proof can release lamports from the vault to a public Solana address.']]
const threats=[['Onchain graph analysis','Commitments and nullifiers break direct ownership links inside shielded state.','Mitigated'],['Boundary correlation','Timing, distinct amounts and reused public wallets can correlate entry and exit.','User model'],['Network metadata','RPC, wallet, browser, relayer and device metadata are outside the Groth16 statement.','Client boundary'],['Compromised keys','A recovery record grants spending authority over its note.','Key security']]
const files=[
  {type:'folder',path:'programs/sarrun',description:'Solana PDA, vault, nullifier and verifier boundary'},
  {type:'file',path:'programs/sarrun/ARCHITECTURE.md',description:'Native Solana program and release design',language:'Markdown',source:architectureSource},
  {type:'folder',path:'circuits',description:'Circom proof statements'},
  {type:'file',path:'circuits/JoinSplit.circom',description:'Two-input, two-output value-conserving JoinSplit',language:'Circom',source:joinSplitSource},
  {type:'folder',path:'sdk',description:'Notes, encrypted delivery, Merkle paths and proof generation'},
  {type:'file',path:'sdk/note.js',description:'Commitments, nullifiers and note encoding',language:'JavaScript',source:noteSource},
  {type:'file',path:'sdk/merkle.js',description:'Client-side tree reconstruction and paths',language:'JavaScript',source:merkleSource},
  {type:'file',path:'sdk/proof.js',description:'Lazy browser Groth16 generation',language:'JavaScript',source:proofSource},
  {type:'file',path:'sdk/payment.js',description:'Solana-prefixed one-time addresses and encrypted note delivery',language:'JavaScript',source:paymentSource},
  {type:'folder',path:'src',description:'Wallet Standard and deployment-gated application'},
  {type:'file',path:'src/solana-client.js',description:'Official Kit client for Solana mainnet',language:'JavaScript',source:clientSource},
  {type:'file',path:'src/protocol.js',description:'Fail-closed program and artifact activation boundary',language:'JavaScript',source:protocolSource},
  {type:'file',path:'deployments/solana-mainnet.json',description:'Client-consumed program registry',language:'JSON',source:deploymentSource},
  {type:'folder',path:'verification',description:'Security and reproducible constraints'},
  {type:'file',path:'SECURITY.md',description:'Threat boundaries and mainnet release requirements',language:'Markdown',source:securitySource},
  {type:'file',path:'README.md',description:'Protocol overview and repository map',language:'Markdown',source:readmeSource},
]
function RepoBrowser(){
  const firstFile=files.find(file=>file.type==='file')
  const [selected,setSelected]=useState(firstFile)
  const [copied,setCopied]=useState(false)
  const openFile=file=>{if(file.type!=='file')return;setSelected(file);setCopied(false);requestAnimationFrame(()=>document.querySelector('#source-viewer')?.scrollIntoView({behavior:'smooth',block:'start'}))}
  const copySource=async()=>{await navigator.clipboard.writeText(selected.source);setCopied(true);setTimeout(()=>setCopied(false),1600)}
  return <div className="repo-browser">
    <div className="repo-bar"><div><Code2/><b>sarrun / protocol</b></div><Status>SOLANA NATIVE</Status></div>
    <div className="repo-files">{files.map(file=>file.type==='folder'
      ? <div className="repo-entry folder" key={file.path}><span><Folder/></span><code>{file.path}</code><p>{file.description}</p></div>
      : <button className={'repo-entry file '+(selected.path===file.path?'active':'')} onClick={()=>openFile(file)} key={file.path}><span><FileCode2/></span><code>{file.path}</code><p>{file.description}</p><b>OPEN</b></button>)}</div>
    <div className="repo-command"><TerminalSquare/><code>npm run protocol:test</code><span>SDK + circuit constraints + deployment gate</span></div>
    <div className="source-viewer" id="source-viewer"><div className="source-head"><div><FileCode2/><span><b>{selected.path}</b><small>{selected.language} · {selected.source.split('\n').length} lines</small></span></div><button onClick={copySource}>{copied?<Check/>:<Copy/>}{copied?'COPIED':'COPY'}</button></div><pre><code>{selected.source.split('\n').map((line,index)=><span className="source-line" key={index}><i>{index+1}</i><em>{line||' '}</em></span>)}</code></pre></div>
  </div>
}
function Head({n,label,title,copy}){return <div className="docs-section-head"><span>{n} / {label}</span><h2>{title}</h2>{copy&&<p>{copy}</p>}</div>}
function MapCard({tag,icon:Icon,title,text,core}){return <article className={core?'architecture-core':''}><span>{tag}</span><Icon/><h3>{title}</h3><p>{text}</p></article>}
function State({title,code,text}){return <article><b>{title}</b><code>{code}</code><p>{text}</p></article>}
function Boundary({icon:Icon,name,text}){return <article><Icon/><div><h3>{name}</h3><p>{text}</p></div><Status>SOURCE</Status></article>}
function Docs(){return <div className="docs-page">
<header className="docs-header"><Logo/><div className="docs-header-links"><Status>PROTOCOL · SOLANA</Status><a className="docs-social" href={X_URL} target="_blank" rel="noreferrer"><XBrand/></a><a className="docs-back" href={BASE}><ArrowLeft/>Back to site</a></div></header>
<div className="docs-layout"><aside className="docs-sidebar"><p>PROTOCOL</p><nav>{nav.map(([id,label])=><a href={'#'+id} key={id}>{label}</a>)}</nav><div className="docs-side-note"><ShieldCheck/><div><b>Fail-closed release</b><span>No program ID, no value-moving instruction.</span></div></div></aside>
<main className="docs-main">
<section className="docs-hero" id="overview"><span className="docs-kicker"><Sparkles/>SARRUN ON SOLANA</span><h1>Architecture,<br/><em>down to the account.</em></h1><p>Sarrun is a persistent shielded-account protocol designed for Solana. SOL enters a value-bound commitment, moves through zero-knowledge JoinSplits and exits only after the program accepts a known root, fresh nullifiers and a valid conservation proof.</p><div className="docs-callout"><Lock/><p><b>Non-custodial by construction.</b> Wallet Standard signs public settlement instructions; spending and viewing secrets remain local to the user's recovery records.</p></div></section>
<section className="docs-section" id="repository"><Head n="01" label="REPOSITORY" title={<>One codebase.<br/>Every trust boundary.</>} copy="Inspect the Solana client, circuit, SDK, program architecture and deployment gate directly in the browser."/><RepoBrowser/></section>
<section className="docs-section" id="architecture"><Head n="02" label="ARCHITECTURE" title={<>Public settlement.<br/>Private state.</>} copy="Solana verifies state transitions without receiving the private note graph."/><div className="architecture-map"><MapCard tag="PUBLIC" icon={Network} title="Solana" text="Program instructions, PDAs, commitments, nullifiers and public SOL exits."/><ArrowRight className="map-arrow"/><MapCard core tag="SHIELDED" icon={Fingerprint} title="Sarrun state" text="Private note values, owners, Merkle paths and zero-knowledge transitions."/><ArrowRight className="map-arrow"/><MapCard tag="USER" icon={KeyRound} title="Local keys" text="One-time spending and viewing keys with portable recovery records."/></div><div className="lifecycle">{lifecycle.map(([n,t,p])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{p}</p></article>)}</div></section>
<section className="docs-section" id="state"><Head n="03" label="STATE MODEL" title={<>Commitments in.<br/>Nullifiers out.</>} copy="The circuit statement stays stable across the Circom circuit, SDK and Solana PDA state."/><div className="state-grid"><State title="Commitment" code="C = Poseidon(asset, lamports, ownerPK, ρ, r)" text="Binds the asset and value while hiding note ownership and randomness."/><State title="PoolState PDA" code="root + roots[32] + frontier[20]" text="Stores the current tree frontier and a bounded recent-root history."/><State title="Nullifier PDA" code="PDA('nullifier', N)" text="Account creation makes a second spend of the same private note fail."/><State title="Conservation" code="Σ inputs = Σ outputs + publicOut" text="128-bit range constraints prevent modular value creation."/></div></section>
<section className="docs-section" id="program"><Head n="04" label="PROGRAM BOUNDARY" title={<>Small instruction set.<br/>Explicit accounts.</>}/><div className="contract-layout"><div className="contract-list"><Boundary icon={FileCode2} name="PoolState + Vault PDAs" text="Track roots and custody the lamports backing every live note."/><Boundary icon={ShieldCheck} name="BN254 verifier adapter" text="Uses Solana alt_bn128 syscalls with one embedded, reviewed verification key."/><Boundary icon={Workflow} name="Nullifier records" text="Bind each spend to a unique PDA and reject duplicate initialization."/></div><pre><code>{'initialize_pool(state, vault, payer)\nshield(state, vault, depositor, commitment, lamports)\ntransact(state, vault, nullifiers[2], outputs[2], proof, publicSignals[8])'}</code></pre></div></section>
<section className="docs-section split-doc" id="proofs"><Head n="05" label="PROOF SYSTEM" title={<>Eight public signals.<br/>Everything else stays local.</>}/><div className="boundary-panel"><EyeOff/><h3>root · N₀ · N₁ · C′₀ · C′₁ · publicOut · recipient · asset</h3><p>The Groth16 proof establishes note ownership, Merkle membership, nullifier derivation, output commitments, field ranges and value conservation. Paths, values, secrets and output owners remain private witnesses.</p><ul><li><Check/>BN254 proof verification maps to Solana's native alt_bn128 syscalls.</li><li><Check/>Twenty-level Poseidon Merkle membership remains Circom-compatible.</li><li><Check/>The verification key is embedded and pinned to the release manifest.</li></ul></div></section>
<section className="docs-section" id="threats"><Head n="06" label="THREAT MODEL" title={<>State the limits<br/>before the claims.</>}/><div className="threat-table">{threats.map(([n,p,s])=><article key={n}><h3>{n}</h3><p>{p}</p><Status warn={s==='User model'}>{s}</Status></article>)}</div></section>
<section className="docs-section release-section" id="verification"><Head n="07" label="VERIFICATION" title={<>Code comes with<br/>evidence.</>} copy="Mainnet activation requires the program binary, embedded verification key, proof artifacts and source commit to match one manifest."/><div className="verification-grid"><article><Check/><div><b>Wallet Standard</b><span>Official Solana Kit discovery, connection, disconnect and mainnet SOL reads.</span></div></article><article><Check/><div><b>6 SDK checks</b><span>Commitments, Merkle paths, one-time addresses and authenticated note encryption.</span></div></article><article><Check/><div><b>2 circuit checks</b><span>Public-signal ordering and rejection of value creation.</span></div></article></div><div className="github-notice"><Files/><div><h3>Deployment manifest</h3><p>The client accepts one reviewed Solana program ID, PDA set and artifact hash registry.</p></div><a href={`${BASE}deployments/solana-mainnet.json`}>OPEN JSON <ArrowUpRight/></a></div></section>
<section className="docs-end"><p>Follow protocol releases, security notes and deployment records.</p><div><a className="primary-btn green" href={X_URL} target="_blank" rel="noreferrer">Follow @sarruncash <ArrowUpRight/></a><a className="primary-btn docs-outline" href={`${BASE}?app=1`}>Launch Sarrun <ArrowRight/></a></div><small>Always verify the Solana cluster, program ID, PDA set and artifact hashes before signing.</small></section>
</main></div></div>}
createRoot(document.getElementById('root')).render(<Docs/>)
