import BeforeAfter from './BeforeAfter'
import Faq from './Faq'
import FileAnatomy from './FileAnatomy'
import FinalCTA from './FinalCTA'
import Hero from './Hero'
import Pricing from './Pricing'
import Steps from './Steps'
import UnblockGuide from './UnblockGuide'
import UseCases from './UseCases'

// Urutan section: terang, gelap, terang, ..., selang-seling seperti Pelajarin.
export default function LandingPage() {
  return (
    <>
      <Hero />
      <BeforeAfter />
      <Steps />
      <UseCases />
      <FileAnatomy />
      <UnblockGuide />
      <Pricing />
      <Faq />
      <FinalCTA />
    </>
  )
}
