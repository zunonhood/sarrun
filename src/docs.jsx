import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Code2, EyeOff, FileCode2, FileJson, Files, Fingerprint, Folder, KeyRound, Lock, Network, ShieldCheck, Sparkles, TerminalSquare, Workflow, Copy } from 'lucide-react'
import './styles.css'
import './docs.css'
import shieldedPoolSource from '../contracts/ShieldedPool.sol?raw'
import verifierInterfaceSource from '../contracts/interfaces/IGroth16Verifier.sol?raw'
import poseidonInterfaceSource from '../contracts/interfaces/IPoseidonT3.sol?raw'
import joinSplitSource from '../circuits/JoinSplit.circom?raw'
import noteSource from '../sdk/note.js?raw'
import merkleSource from '../sdk/merkle.js?raw'
import proofSource from '../sdk/proof.js?raw'
import paymentSource from '../sdk/payment.js?raw'
import protocolSource from './protocol.js?raw'
import integrationTestSource from '../test/contracts/Protocol.integration.test.cjs?raw'
import deploymentSource from '../deployments/robinhood-mainnet.json?raw'
import deployScriptSource from '../scripts/deploy-pool.cjs?raw'
import releaseCheckSource from '../scripts/release-check.mjs?raw'
import securitySource from '../SECURITY.md?raw'
import readmeSource from '../README.md?raw'

const X_URL = 'https://x.com/sarruncash'
const BASE = import.meta.env.BASE_URL
function Logo(){return <a className="docs-logo" href={BASE}><span><img src={`${BASE}sarrun-logo-transparent.png`} alt="" /></span><b>sarrun</b><i>/docs</i></a>}
function XBrand(){return <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.967 6.817H1.68l7.724-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"/></svg>}
function Status({children,warn=false}){return <span className={'doc-status '+(warn?'warn':'')}>{children}</span>}
const nav=[['overview','Overview'],['repository','Repository'],['architecture','Architecture'],['state','State model'],['contracts','Contract ABI'],['proofs','Proof system'],['threats','Threat model'],['verification','Verification']]
const lifecycle=[['01','Shield','ETH and a one-time public key create a value-bound private commitment.'],['02','Receive','A one-time address uses X25519 and AES-GCM to deliver an encrypted note.'],['03','Transfer','A JoinSplit proof consumes a note and creates recipient and change commitments.'],['04','Exit','A valid proof can return value to an EVM recipient.']]
const threats=[['Onchain graph analysis','Commitments and nullifiers break direct ownership links inside shielded state.','Mitigated'],['Boundary correlation','Timing, distinct amounts and reused public wallets can correlate entry and exit.','User model'],['Network metadata','RPC, relayer, browser and device metadata are outside the Groth16 statement.','Client boundary'],['Compromised keys','A recovery record grants spending authority over its note.','Key security']]
const files=[
  {type:'folder',path:'contracts',description:'Solidity settlement and verifier interfaces'},
  {type:'file',path:'contracts/ShieldedPool.sol',description:'Poseidon tree, roots, nullifiers and native exits',language:'Solidity',source:shieldedPoolSource},
  {type:'file',path:'contracts/interfaces/IGroth16Verifier.sol',description:'Eight-signal verifier boundary',language:'Solidity',source:verifierInterfaceSource},
  {type:'file',path:'contracts/interfaces/IPoseidonT3.sol',description:'Onchain Merkle hash interface',language:'Solidity',source:poseidonInterfaceSource},
  {type:'folder',path:'circuits',description:'Circom proof statements'},
  {type:'file',path:'circuits/JoinSplit.circom',description:'Two-input, two-output value-conserving JoinSplit',language:'Circom',source:joinSplitSource},
  {type:'folder',path:'sdk',description:'Notes, encrypted delivery, Merkle paths and proof calldata'},
  {type:'file',path:'sdk/note.js',description:'Commitments, nullifiers and recovery encoding',language:'JavaScript',source:noteSource},
  {type:'file',path:'sdk/merkle.js',description:'Client-side tree reconstruction and paths',language:'JavaScript',source:merkleSource},
  {type:'file',path:'sdk/proof.js',description:'Lazy Groth16 generation and Solidity formatting',language:'JavaScript',source:proofSource},
  {type:'file',path:'sdk/payment.js',description:'One-time addresses and encrypted note delivery',language:'JavaScript',source:paymentSource},
  {type:'file',path:'src/protocol.js',description:'Shield, transfer, exit, scanning and recovery client',language:'JavaScript',source:protocolSource},
  {type:'folder',path:'deployment',description:'Mainnet registry and guarded deployment'},
  {type:'file',path:'deployments/robinhood-mainnet.json',description:'Client-consumed chain registry',language:'JSON',source:deploymentSource},
  {type:'file',path:'scripts/deploy-pool.cjs',description:'Release-gated Robinhood Chain deployment',language:'JavaScript',source:deployScriptSource},
  {type:'file',path:'scripts/release-check.mjs',description:'Ceremony, audit, artifact and bytecode release gate',language:'JavaScript',source:releaseCheckSource},
  {type:'folder',path:'verification',description:'Integration tests and security boundaries'},
  {type:'file',path:'test/contracts/Protocol.integration.test.cjs',description:'Proof-to-verifier-to-pool integration',language:'JavaScript',source:integrationTestSource},
  {type:'file',path:'SECURITY.md',description:'Threat boundaries and release requirements',language:'Markdown',source:securitySource},
  {type:'file',path:'README.md',description:'Protocol overview and reproducible commands',language:'Markdown',source:readmeSource},
]
function RepoBrowser(){
  const firstFile=files.find(file=>file.type==='file')
  const [selected,setSelected]=useState(firstFile)
  const [copied,setCopied]=useState(false)
  const openFile=file=>{
    if(file.type!=='file')return
    setSelected(file);setCopied(false)
    requestAnimationFrame(()=>document.querySelector('#source-viewer')?.scrollIntoView({behavior:'smooth',block:'start'}))
  }
  const copySource=async()=>{
    await navigator.clipboard.writeText(selected.source)
    setCopied(true);setTimeout(()=>setCopied(false),1600)
  }
  return <div className="repo-browser">
    <div className="repo-bar"><div><Code2/><b>sarrun / protocol</b></div><Status>16 CHECKS PASSING</Status></div>
    <div className="repo-files">{files.map(file=>file.type==='folder'
      ? <div className="repo-entry folder" key={file.path}><span><Folder/></span><code>{file.path}</code><p>{file.description}</p></div>
      : <button className={'repo-entry file '+(selected.path===file.path?'active':'')} onClick={()=>openFile(file)} key={file.path}><span><FileCode2/></span><code>{file.path}</code><p>{file.description}</p><b>OPEN</b></button>)}</div>
    <div className="repo-command"><TerminalSquare/><code>npm run protocol:test</code><span>contracts + SDK + circuit constraints</span></div>
    <div className="source-viewer" id="source-viewer">
      <div className="source-head"><div><FileCode2/><span><b>{selected.path}</b><small>{selected.language} · {selected.source.split('\n').length} lines</small></span></div><button onClick={copySource}>{copied?<Check/>:<Copy/>}{copied?'COPIED':'COPY'}</button></div>
      <pre><code>{selected.source.split('\n').map((line,index)=><span className="source-line" key={index}><i>{index+1}</i><em>{line||' '}</em></span>)}</code></pre>
    </div>
  </div>
}
function Head({n,label,title,copy}){return <div className="docs-section-head"><span>{n} / {label}</span><h2>{title}</h2>{copy&&<p>{copy}</p>}</div>}
function MapCard({tag,icon:Icon,title,text,core}){return <article className={core?'architecture-core':''}><span>{tag}</span><Icon/><h3>{title}</h3><p>{text}</p></article>}
function State({title,code,text}){return <article><b>{title}</b><code>{code}</code><p>{text}</p></article>}
function Contract({icon:Icon,name,text}){return <article><Icon/><div><h3>{name}</h3><p>{text}</p></div><Status>SOURCE</Status></article>}
function Docs(){return <div className="docs-page">
<header className="docs-header"><Logo/><div className="docs-header-links"><Status>PROTOCOL · V0.1</Status><a className="docs-social" href={X_URL} target="_blank" rel="noreferrer"><XBrand/></a><a className="docs-back" href="/"><ArrowLeft/>Back to site</a></div></header>
<div className="docs-layout"><aside className="docs-sidebar"><p>PROTOCOL</p><nav>{nav.map(([id,label])=><a href={'#'+id} key={id}>{label}</a>)}</nav><div className="docs-side-note"><ShieldCheck/><div><b>Reproducible core</b><span>Contracts, circuits and tests share one ABI.</span></div></div></aside>
<main className="docs-main">
<section className="docs-hero" id="overview"><span className="docs-kicker"><Sparkles/>SARRUN PROTOCOL</span><h1>Architecture,<br/><em>down to the constraint.</em></h1><p>Sarrun is a persistent shielded account layer for Robinhood Chain. ETH enters a value-bound commitment, moves through zero-knowledge JoinSplits and exits only when a valid nullifier and conservation proof are verified.</p><div className="docs-callout"><Lock/><p><b>Non-custodial by construction.</b> The pool verifies proofs and holds settlement liquidity; it never receives a note secret, spending key or Merkle path.</p></div></section>
<section className="docs-section" id="repository"><Head n="01" label="REPOSITORY" title={<>One codebase.<br/>Every trust boundary.</>} copy="Select any source file below to inspect every line directly in the browser, then copy it for local verification."/><RepoBrowser/></section>
<section className="docs-section" id="architecture"><Head n="02" label="ARCHITECTURE" title={<>Public settlement.<br/>Private state.</>} copy="Robinhood Chain verifies valid state transitions without receiving the private account graph."/><div className="architecture-map"><MapCard tag="PUBLIC" icon={Network} title="Robinhood Chain" text="Deposits, roots, commitments, nullifiers, verifier calls and public exits."/><ArrowRight className="map-arrow"/><MapCard core tag="SHIELDED" icon={Fingerprint} title="Sarrun state" text="Private note values, owners, Merkle paths and zero-knowledge transitions."/><ArrowRight className="map-arrow"/><MapCard tag="USER" icon={KeyRound} title="Local keys" text="One-time spending and viewing keys with portable local recovery records."/></div><div className="lifecycle">{lifecycle.map(([n,t,p])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{p}</p></article>)}</div></section>
<section className="docs-section" id="state"><Head n="03" label="STATE MODEL" title={<>Commitments in.<br/>Nullifiers out.</>} copy="Each formula below maps directly to JoinSplit.circom, note.js and ShieldedPool.sol."/><div className="state-grid"><State title="Commitment" code="C = Poseidon(asset, value, ownerPK, ρ, r)" text="Binds the asset and value while hiding note ownership and randomness."/><State title="Merkle root" code="root = PoseidonTree.append(C)" text="Authenticates one of 1,048,576 note positions at depth 20."/><State title="Nullifier" code="N = Poseidon(C, ownerSecret)" text="Prevents a private note from being spent twice without revealing C."/><State title="Conservation" code="Σ inputs = Σ outputs + publicOut" text="128-bit range constraints prevent modular value creation."/></div></section>
<section className="docs-section" id="contracts"><Head n="04" label="CONTRACT ABI" title={<>Small surface.<br/>Explicit responsibilities.</>}/><div className="contract-layout"><div className="contract-list"><Contract icon={FileCode2} name="ShieldedPool" text="Binds ETH deposits to commitments, updates roots and rejects spent nullifiers."/><Contract icon={ShieldCheck} name="IGroth16Verifier" text="Validates exactly eight ordered public signals for each JoinSplit."/><Contract icon={Workflow} name="Poseidon T3 / T6" text="Keeps tree and note hashing identical across Solidity, Circom and the SDK."/></div><pre><code>{'interface IShieldedPool {\n  shield(ownerPK, rho, randomness) payable;\n  transact(a, b, c, publicSignals[8], encryptedOut0, encryptedOut1);\n  currentRoot() view returns (uint256);\n  isKnownRoot(root) view returns (bool);\n}'}</code></pre></div></section>
<section className="docs-section split-doc" id="proofs"><Head n="05" label="PROOF SYSTEM" title={<>Eight public signals.<br/>Everything else stays local.</>}/><div className="boundary-panel"><EyeOff/><h3>root · N₀ · N₁ · C′₀ · C′₁ · publicOut · recipient · asset</h3><p>The Groth16 proof establishes note ownership, Merkle membership, nullifier derivation, output commitments, field ranges and value conservation. Paths, values, secrets and output owners remain private witnesses.</p><ul><li><Check/>Up to two existing notes are consumed; two fresh notes are created, typically for the recipient and change.</li><li><Check/>20-level Poseidon Merkle membership.</li><li><Check/>Solidity verifier ABI locked by integration tests.</li></ul></div></section>
<section className="docs-section" id="threats"><Head n="06" label="THREAT MODEL" title={<>State the limits<br/>before the claims.</>}/><div className="threat-table">{threats.map(([n,p,s])=><article key={n}><h3>{n}</h3><p>{p}</p><Status warn={s==='User model'}>{s}</Status></article>)}</div></section>
<section className="docs-section release-section" id="verification"><Head n="07" label="VERIFICATION" title={<>Code comes with<br/>evidence.</>} copy="The test matrix covers contract state, SDK primitives, circuit failure cases and an end-to-end Groth16 verification path."/><div className="verification-grid"><article><Check/><div><b>8 contract checks</b><span>Tree roots, exits, nullifiers, encrypted outputs, payload limits and verifier rejection.</span></div></article><article><Check/><div><b>6 SDK checks</b><span>Commitments, Merkle paths, one-time addresses and authenticated note encryption.</span></div></article><article><Check/><div><b>2 circuit checks</b><span>Public-signal ABI and rejection of value creation.</span></div></article></div><div className="github-notice"><Files/><div><h3>Deployment manifest</h3><p>Clients accept protocol addresses and proof artifact hashes from one chain-specific registry.</p></div><a href={`${BASE}deployments/robinhood-mainnet.json`}>OPEN JSON <ArrowUpRight/></a></div></section>
<section className="docs-end"><p>Follow protocol releases, security notes and deployment records.</p><div><a className="primary-btn green" href={X_URL} target="_blank" rel="noreferrer">Follow @sarruncash <ArrowUpRight/></a><a className="primary-btn docs-outline" href={`${BASE}?app=1`}>Launch Sarrun <ArrowRight/></a></div><small>Always verify the chain ID, pool address and verifier before signing.</small></section>
</main></div></div>}
createRoot(document.getElementById('root')).render(<Docs/>)