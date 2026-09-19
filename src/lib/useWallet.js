// Shared wallet state, lifted out of any single page so it PERSISTS across
// routes (landing / login / tracker). One instance lives at the app root and
// is passed down; navigating between pages does not reconnect the wallet.

import { useEffect, useState, useCallback } from 'react'
import { connectWallet, hasWallet, friendlyError } from './chain.js'

export function useWallet() {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [address, setAddress] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const connected = !!address

  const connect = useCallback(async () => {
    setError('')
    setConnecting(true)
    try {
      const { provider: p, signer: s, address: a } = await connectWallet()
      setProvider(p)
      setSigner(s)
      setAddress(a)
      return { provider: p, signer: s, address: a }
    } catch (err) {
      const msg = friendlyError(err)
      setError(msg)
      throw err
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setProvider(null)
    setSigner(null)
    setAddress('')
    setError('')
  }, [])

  // Reload on account/network change so state never goes stale.
  useEffect(() => {
    if (!hasWallet()) return
    const eth = window.ethereum
    const onAccounts = () => window.location.reload()
    const onChain = () => window.location.reload()
    eth.on?.('accountsChanged', onAccounts)
    eth.on?.('chainChanged', onChain)
    return () => {
      eth.removeListener?.('accountsChanged', onAccounts)
      eth.removeListener?.('chainChanged', onChain)
    }
  }, [])

  return {
    provider,
    signer,
    address,
    connected,
    connecting,
    error,
    walletMissing: !hasWallet(),
    connect,
    disconnect,
  }
}
