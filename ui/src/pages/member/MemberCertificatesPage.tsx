import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BookOpen, Printer, CheckCircle2, Sparkles, X } from 'lucide-react';
import { MemberDetailLayout } from '@/components/MemberDetailLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { api, asList } from '@/lib/api';

export function MemberCertificatesPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [certSettings, setCertSettings] = useState<any>({
    branding_name: 'The School of Faith',
    title: 'Certificate of Completion',
    subtitle: 'This is proudly presented to',
    description: 'For successfully completing all requirements and modules of the discipleship course:',
    signature_name: 'Pastor Sarah Jenkins',
    signature_title: 'Senior Pastor & Founder',
    footer_text: 'Accredited by The School of Faith Global Leadership Network',
  });
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<any | null>(null);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const [data, setRes] = await Promise.all([
        api.getMemberCertificates(),
        api.getCertificateSettings().catch(() => null),
      ]);
      setCertificates(asList<any>(data));
      if (setRes) {
        setCertSettings({
          branding_name: setRes.branding_name || 'The School of Faith',
          title: setRes.title || 'Certificate of Completion',
          subtitle: setRes.subtitle || 'This is proudly presented to',
          description: setRes.description || 'For successfully completing all requirements and modules of the discipleship course:',
          signature_name: setRes.signature_name || 'Pastor Sarah Jenkins',
          signature_title: setRes.signature_title || 'Senior Pastor & Founder',
          footer_text: setRes.footer_text || 'Accredited by The School of Faith Global Leadership Network',
        });
      }
    } catch (err) {
      console.error('Failed to load member certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <MemberDetailLayout title="My Certificates">
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
        </div>
      </MemberDetailLayout>
    );
  }

  return (
    <MemberDetailLayout title="My Certificates">
      {certificates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary">
            <Award className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-medium text-foreground">No Certificates Earned Yet</h3>
            <p className="text-sm max-w-md mx-auto">
              Complete your enrolled courses on School of Faith to earn official accredited certificates of completion.
            </p>
          </div>
          <Button onClick={() => navigate('/learn')} className="mt-2" size="sm">
            <BookOpen className="h-4 w-4 mr-2" /> Go to Learn
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((cert) => {
            const courseTitle = cert.course?.title || cert.title?.replace('Certificate of Completion - ', '') || 'Course Completion';
            const issueDate = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Verified';

            return (
              <Card
                key={cert.id}
                className="overflow-hidden border-border/80 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="h-2 bg-[#C59B46]" />
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-[#C59B46]">
                        <Sparkles className="h-3 w-3" /> Official Certificate
                      </span>
                      <h3 className="font-serif text-xl font-medium text-foreground leading-snug">
                        {courseTitle}
                      </h3>
                      {cert.course?.instructor && (
                        <p className="text-xs text-muted-foreground">Instructor: {cert.course.instructor}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Valid
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <span className="font-mono text-[11px] text-muted-foreground/80">{cert.certificate_number}</span>
                    <span>Issued {issueDate}</span>
                  </div>

                  <div className="pt-1">
                    <Button
                      onClick={() => setSelectedCert(cert)}
                      className="w-full bg-[#C59B46] hover:bg-[#b0843d] text-white font-medium text-xs py-2 shadow-sm gap-1.5"
                    >
                      <Award className="h-4 w-4" /> View Certificate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Certificate Modal Overlay */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-background border border-border shadow-2xl">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-8 md:p-12 text-center space-y-6 border-8 border-double border-[#C59B46]/40 bg-gradient-to-b from-[#FAF6EE] to-background dark:from-background dark:to-card relative">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#C59B46]/15 text-[#C59B46]">
                  <Award className="h-10 w-10" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-serif font-bold uppercase tracking-widest text-[#C59B46]">
                  {certSettings.branding_name}
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground tracking-tight">
                  {certSettings.title}
                </h2>
                <p className="text-sm font-light text-muted-foreground italic">
                  {certSettings.subtitle}
                </p>
              </div>

              <div className="py-2 border-b-2 border-[#C59B46]/40 max-w-sm mx-auto">
                <h3 className="font-serif text-2xl md:text-3xl font-medium text-foreground tracking-wide">
                  {profile?.first_name} {profile?.last_name}
                </h3>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                {certSettings.description}
              </p>

              <h4 className="font-serif text-xl font-medium text-[#C59B46]">
                {selectedCert.course?.title || selectedCert.title}
              </h4>

              {/* Signatures & Accreditation Footer */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/60 text-xs text-muted-foreground">
                <div className="text-left">
                  <p className="font-serif font-bold text-foreground text-sm">{certSettings.signature_name}</p>
                  <p className="text-[11px] text-muted-foreground">{certSettings.signature_title}</p>
                  <p className="text-[10px] mt-1 text-muted-foreground/80">
                    Issued: {selectedCert.issue_date ? new Date(selectedCert.issue_date).toLocaleDateString() : 'Verified'}
                  </p>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Certificate Number</p>
                    <p className="font-mono text-[11px]">{selectedCert.certificate_number}</p>
                  </div>
                  <p className="text-[10px] italic text-[#C59B46] mt-2">{certSettings.footer_text}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </Button>
                <Button size="sm" onClick={() => setSelectedCert(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MemberDetailLayout>
  );
}
