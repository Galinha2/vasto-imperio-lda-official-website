"use client";

import contentpt from "@/assets/contentpt.json";
import contenten from "@/assets/contenten.json";
import { useLanguage } from "../header/LanguageContext";
import { LuStore } from "react-icons/lu";
import { CiLocationOn, CiMail } from "react-icons/ci";
import { MdOutlineLocalPhone } from "react-icons/md";
import Link from "next/link";

const icons = {
  location: CiLocationOn,
  phone: MdOutlineLocalPhone,
  mail: CiMail,
};

function ContactCard() {
  const { language } = useLanguage();
  const { text } = (language === "pt" ? contentpt : contenten).homeContacts;
  const content = language === "pt" ? contentpt : contenten;
  const item = content.homeContacts;

  return (
    <div className="mb-10">
          <h1 className="mb-5 px-5 m-auto w-full text-(--orange) font-bold text-[1.5em] md:text-[2em] text-center">{item.title}</h1>
        <div className="bg-(--gray) flex flex-col items-center flex-wrap justify-center gap-3 px-4 py-8">
          <div className="flex gap-5 items-center flex-col md:flex-row justify-center">
              {text.map(({ location, phone, mail }, index) => (
                <div
                  key={`${location}-${index}`}
                  className="flex flex-row items-center gap-4 bg-white rounded-[30px] px-4 py-4 shadow-sm w-auto"
                >
                  <div
                    className={`bg-(--gray) shadow-md w-20 h-20 flex items-center justify-center text-5xl rounded-full flex-shrink-0 ${
                      index === 0 ? "text-(--orange)" : "text-(--blue)"
                    }`}
                  >
                    <LuStore />
                  </div>
                  <div className="flex flex-col gap-1 text-[0.8em] md:text-sm">
                    {[
                      {
                        Icon: icons.location,
                        content: <span className="text-black">{location}</span>,
                        bold: true,
                      },
                      {
                        Icon: icons.phone,
                        content: (
                          <a
                            href={`tel:${phone.replace(/\s+/g, "")}`}
                            className="text-black hover:underline"
                          >
                            {phone}
                          </a>
                        ),
                      },
                      {
                        Icon: icons.mail,
                        content: (
                          <a
                            href={`mailto:${mail}`}
                            className="text-black hover:underline"
                          >
                            {mail}
                          </a>
                        ),
                      },
                    ].map(({ Icon, content, bold }, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 text-[1.2em] font-medium ${
                          index === 0 ? "text-(--orange)" : "text-(--blue)"
                        } ${bold ? "font-semibold" : ""}`}
                      >
                        <Icon
                          className={`text-2xl font-bold ${
                            index === 0 ? "text-(--orange)" : "text-(--blue)"
                          }`}
                        />
                        {content}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
          <p className="text-2xl text-center">{item.subTitle}</p>
          <Link className="bg-(--orange) text-center px-5 text-white py-2 min-w-35 shadow-md rounded-full" href={item.url}>{item.button}</Link>
        </div>
    </div>
  );
}

export default ContactCard;
