DROP POLICY "Published services are public" ON public.website_services;
DROP POLICY "Staff manage website services" ON public.website_services;
CREATE POLICY "Visitors view published services" ON public.website_services FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Staff and visitors view services" ON public.website_services FOR SELECT TO authenticated USING (is_published = true OR (select public.is_staff()));
CREATE POLICY "Staff add services" ON public.website_services FOR INSERT TO authenticated WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff edit services" ON public.website_services FOR UPDATE TO authenticated USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff delete services" ON public.website_services FOR DELETE TO authenticated USING ((select public.is_staff()));

DROP POLICY "Homepage content is public" ON public.website_homepage;
DROP POLICY "Staff manage homepage content" ON public.website_homepage;
CREATE POLICY "Visitors view homepage" ON public.website_homepage FOR SELECT TO anon USING (true);
CREATE POLICY "Staff view homepage" ON public.website_homepage FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff add homepage" ON public.website_homepage FOR INSERT TO authenticated WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff edit homepage" ON public.website_homepage FOR UPDATE TO authenticated USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff delete homepage" ON public.website_homepage FOR DELETE TO authenticated USING ((select public.is_staff()));

DROP POLICY "Published sections are public" ON public.website_sections;
DROP POLICY "Staff manage website sections" ON public.website_sections;
CREATE POLICY "Visitors view published sections" ON public.website_sections FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Staff and visitors view sections" ON public.website_sections FOR SELECT TO authenticated USING (is_published = true OR (select public.is_staff()));
CREATE POLICY "Staff add sections" ON public.website_sections FOR INSERT TO authenticated WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff edit sections" ON public.website_sections FOR UPDATE TO authenticated USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff delete sections" ON public.website_sections FOR DELETE TO authenticated USING ((select public.is_staff()));

DROP POLICY "Published pages are public" ON public.website_pages;
DROP POLICY "Staff manage website pages" ON public.website_pages;
CREATE POLICY "Visitors view published pages" ON public.website_pages FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "Staff and visitors view pages" ON public.website_pages FOR SELECT TO authenticated USING (is_published = true OR (select public.is_staff()));
CREATE POLICY "Staff add pages" ON public.website_pages FOR INSERT TO authenticated WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff edit pages" ON public.website_pages FOR UPDATE TO authenticated USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));
CREATE POLICY "Staff delete pages" ON public.website_pages FOR DELETE TO authenticated USING ((select public.is_staff()));