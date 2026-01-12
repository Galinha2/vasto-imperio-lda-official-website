export const metadata = {
    title: "Home",
};

import Banner from "@/components/home/Banner";
import InfoIconsCards from "@/components/home/InfoIconsCards";

export default function Page() {
    return (
        <div>
            <Banner />
            <InfoIconsCards />
        </div>
    );
}
