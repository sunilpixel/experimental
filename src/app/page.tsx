import Hero from "@/sections/Hero";
import Nature from "@/sections/Nature";
import Residences from "@/sections/Residences";
import Passage from "@/sections/Passage";
import Experiences from "@/sections/Experiences";
import Architecture from "@/sections/Architecture";
import Sustainability from "@/sections/Sustainability";
import Testimonial from "@/sections/Testimonial";
import Contact from "@/sections/Contact";
import FinalReveal from "@/sections/FinalReveal";

/**
 * AURUM — one continuous scroll. The order is the film's edit; each chapter
 * hands off to the next through its own transition rather than a cut.
 */
export default function Page() {
  return (
    <>
      <Hero />
      <Nature />
      <Residences />
      <Passage />
      <Experiences />
      <Architecture />
      <Sustainability />
      <Testimonial />
      <Contact />
      <FinalReveal />
    </>
  );
}
